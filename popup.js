document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        views: {
            list: document.getElementById('list-view'),
            form: document.getElementById('form-view'),
            detail: document.getElementById('detail-view') // New View
        },
        buttons: {
            add: document.getElementById('add-btn'),
            cancel: document.getElementById('cancel-btn'),
            save: document.querySelector('#problem-form button[type="submit"]'),
            back: document.getElementById('back-btn'), // New Button
            detailEdit: document.getElementById('detail-edit-btn'), // New Button
            export: document.getElementById('export-btn'),
            import: document.getElementById('import-btn')
        },
        form: document.getElementById('problem-form'),
        inputs: {
            link: document.getElementById('problem-link'),
            notes: document.getElementById('problem-notes'),
            search: document.getElementById('search-input'),
            importFile: document.getElementById('import-file')
        },
        listContainer: document.getElementById('problems-list'),
        formTitle: document.getElementById('form-title'),
        searchContainer: document.getElementById('search-container'),

        // Detail View Elements
        detail: {
            title: document.getElementById('detail-title'),
            meta: document.getElementById('detail-meta'),
            tags: document.getElementById('detail-tags'),
            notes: document.getElementById('detail-notes'),
            link: document.getElementById('detail-link')
        }
    };

    let editingId = null;
    let currentDetailId = null; // Track which problem is being viewed

    // --- API Helpers ---
    const API = {
        parseUrl(url) {
            try {
                const u = new URL(url);
                if (u.hostname !== 'codeforces.com') return null;

                // Match /contest/123/problem/A
                const contestMatch = u.pathname.match(/contest\/(\d+)\/problem\/(\w+)/i);
                if (contestMatch) return { contestId: contestMatch[1], index: contestMatch[2] };

                // Match /problemset/problem/123/A
                const problemsetMatch = u.pathname.match(/problemset\/problem\/(\d+)\/(\w+)/i);
                if (problemsetMatch) return { contestId: problemsetMatch[1], index: problemsetMatch[2] };

                return null;
            } catch {
                return null;
            }
        },

        async fetchDetails(url) {
            const identifiers = this.parseUrl(url);
            if (!identifiers) return { name: url }; // Fallback to URL as name

            try {
                const response = await fetch(`https://codeforces.com/api/contest.standings?contestId=${identifiers.contestId}&from=1&count=1`);
                const data = await response.json();

                if (data.status === 'OK') {
                    const problem = data.result.problems.find(p => p.index.toUpperCase() === identifiers.index.toUpperCase());
                    if (problem) {
                        return {
                            name: problem.name,
                            rating: problem.rating,
                            tags: problem.tags,
                            contestId: identifiers.contestId,
                            index: identifiers.index
                        };
                    }
                }
            } catch (err) {
                console.error('API Error:', err);
            }
            return { name: url }; // Fallback
        },

        getRatingClass(rating) {
            if (!rating) return 'rating-gray';
            if (rating < 1200) return 'rating-gray';
            if (rating < 1400) return 'rating-green';
            if (rating < 1600) return 'rating-cyan';
            if (rating < 1900) return 'rating-blue';
            if (rating < 2100) return 'rating-violet';
            if (rating < 2400) return 'rating-orange';
            return 'rating-red';
        }
    };

    // --- State Management ---
    const State = {
        problems: [],

        async load() {
            const result = await chrome.storage.local.get('problems');
            this.problems = result.problems || [];
            this.render();
        },

        async save(link, notes) {
            // Set loading state
            const originalBtnText = elements.buttons.save.innerText;
            elements.buttons.save.innerHTML = '<span class="loading-spinner"></span> Saving...';
            elements.buttons.save.disabled = true;

            const existing = editingId ? this.problems.find(p => p.id === editingId) : null;
            let metadata = {};

            // Fetch metadata if link changed or new problem
            if (!existing || existing.link !== link) {
                metadata = await API.fetchDetails(link);
            } else {
                // Keep existing metadata
                metadata = {
                    name: existing.name,
                    rating: existing.rating,
                    tags: existing.tags,
                    contestId: existing.contestId,
                    index: existing.index
                };
            }

            const problemData = {
                link,
                notes,
                ...metadata
            };

            if (editingId) {
                const index = this.problems.findIndex(p => p.id === editingId);
                if (index !== -1) {
                    this.problems[index] = { ...this.problems[index], ...problemData };
                }
            } else {
                this.problems.unshift({
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    ...problemData
                });
            }

            await chrome.storage.local.set({ problems: this.problems });

            // If we were editing while in detail view, go back to detail view
            if (currentDetailId && editingId === currentDetailId) {
                Navigation.showDetail(this.problems.find(p => p.id === currentDetailId));
            } else {
                Navigation.showList();
            }

            // Reset state
            editingId = null;
            elements.buttons.save.innerHTML = originalBtnText;
            elements.buttons.save.disabled = false;

            this.render();
        },

        async delete(id) {
            this.problems = this.problems.filter(p => p.id !== id);
            await chrome.storage.local.set({ problems: this.problems });
            this.render();
        },

        async exportData() {
            const data = JSON.stringify(this.problems, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cf-notes-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        async importData(file) {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const imported = JSON.parse(e.target.result);
                    if (!Array.isArray(imported)) throw new Error('Invalid format: Expected an array of notes');

                    let count = 0;
                    imported.forEach(p => {
                        if (!p.id || !p.link) return; // Simple validation
                        const idx = this.problems.findIndex(ex => ex.id === p.id);
                        if (idx !== -1) {
                            this.problems[idx] = { ...this.problems[idx], ...p }; // Update existing
                        } else {
                            this.problems.push(p);
                        }
                        count++;
                    });

                    // Re-sort by date descending
                    this.problems.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

                    await chrome.storage.local.set({ problems: this.problems });
                    this.render();
                    alert(`Successfully imported ${count} notes.`);
                } catch (err) {
                    alert('Error importing file: ' + err.message);
                }
            };
            reader.readAsText(file);
        },

        render() {
            elements.listContainer.innerHTML = '';

            // Get filter values directly
            const searchText = elements.inputs.search.value.toLowerCase();
            const filterRating = elements.inputs.filterRating ? elements.inputs.filterRating.value : '';
            const filterTags = elements.inputs.filterTags && elements.inputs.filterTags.value ?
                elements.inputs.filterTags.value.toLowerCase().split(',').map(t => t.trim()).filter(t => t) : [];

            const filtered = this.problems.filter(p => {
                const name = (p.name || '').toLowerCase();
                const tagsStr = (p.tags || []).join(' ').toLowerCase();
                const textMatch = p.link.toLowerCase().includes(searchText) ||
                    p.notes.toLowerCase().includes(searchText) ||
                    name.includes(searchText) ||
                    tagsStr.includes(searchText);

                if (!textMatch) return false;

                // Rating Filter
                if (filterRating) {
                    if (!p.rating || p.rating.toString() !== filterRating) return false;
                }

                // Tags Filter (AND logic)
                if (filterTags.length > 0) {
                    if (!p.tags) return false;
                    const problemTags = p.tags.map(t => t.toLowerCase());
                    const hasAllTags = filterTags.every(ft => problemTags.some(pt => pt.includes(ft)));
                    if (!hasAllTags) return false;
                }

                return true;
            });

            if (filtered.length === 0) {
                elements.listContainer.innerHTML = `
                    <div class="empty-state">
                        <p>${this.problems.length === 0 ? 'No problems saved yet.' : 'No matches found.'}</p>
                    </div>`;
                return;
            }

            filtered.forEach(p => {
                const card = document.createElement('div');
                card.className = 'problem-card';

                // Construct Metadata HTML
                const ratingClass = API.getRatingClass(p.rating);
                const ratingHtml = p.rating ? `<span class="rating-badge ${ratingClass}">${p.rating}</span>` : '';
                const tagsHtml = p.tags && p.tags.length ?
                    `<div class="tags-container">${p.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>` : '';
                // Only link is clickable to open new tab, title opens detail view
                const titleHtml = `<span class="problem-title">${p.name || p.link}</span>`;
                const subLinkHtml = p.name !== p.link ? `<span class="problem-link-sub">${p.link}</span>` : '';

                card.innerHTML = `
                    <div class="card-header">
                        <div style="flex: 1; min-width: 0;">
                            ${titleHtml}
                            <div class="meta-row">
                                ${ratingHtml}
                                ${subLinkHtml}
                            </div>
                            ${tagsHtml}
                        </div>
                        <div class="card-actions">
                            <button class="btn-sm btn-delete" data-id="${p.id}">Delete</button>
                        </div>
                    </div>
                    <div class="card-notes" style="margin-top: 12px;">${escapeHtml(p.notes)}</div>
                `;

                // Clicking the note or card body opens detail
                // We prevent default on delete button to avoid triggering this
                card.addEventListener('click', (e) => {
                    if (!e.target.closest('.card-actions')) {
                        Navigation.showDetail(p);
                    }
                });

                elements.listContainer.appendChild(card);
            });

            // Re-attach listeners
            document.querySelectorAll('.btn-delete').forEach(b => {
                b.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card click
                    if (confirm('Delete this note?')) this.delete(e.target.dataset.id)
                });
            });
        },

        startEdit(id) {
            const problem = this.problems.find(p => p.id === id);
            if (!problem) return;

            editingId = id;
            elements.inputs.link.value = problem.link;
            elements.inputs.notes.value = problem.notes;
            elements.formTitle.textContent = 'Edit Problem';
            Navigation.showForm();
        }
    };

    // --- Navigation ---
    const Navigation = {
        hideAll() {
            Object.values(elements.views).forEach(el => {
                el.classList.add('hidden');
                el.classList.remove('active');
            });
        },
        showList() {
            this.hideAll();
            elements.views.list.classList.remove('hidden');
            elements.views.list.classList.add('active');
            elements.buttons.add.style.display = 'flex';
            elements.searchContainer.style.display = 'flex'; // Flex for search layout

            // Restore filter panel
            if (elements.filterPanel) {
                elements.filterPanel.style.display = '';
            }

            editingId = null;
            currentDetailId = null;
        },
        showForm() {
            this.hideAll();
            elements.views.form.classList.remove('hidden');
            elements.views.form.classList.add('active');
            elements.buttons.add.style.display = 'none';
            elements.searchContainer.style.display = 'none';

            // Hide filter panel
            if (elements.filterPanel) {
                elements.filterPanel.style.display = 'none';
            }
        },
        showDetail(problem) {
            this.hideAll();
            elements.views.detail.classList.remove('hidden');
            elements.views.detail.classList.add('active');
            elements.buttons.add.style.display = 'none';
            elements.searchContainer.style.display = 'none';

            // Hide filter panel
            if (elements.filterPanel) {
                elements.filterPanel.style.display = 'none';
            }

            currentDetailId = problem.id;

            // Populate Detail View
            elements.detail.title.textContent = problem.name || problem.link;
            elements.detail.notes.textContent = problem.notes;
            elements.detail.link.href = problem.link;

            // Meta (Rating + Link)
            elements.detail.meta.innerHTML = '';
            if (problem.rating) {
                const rSpan = document.createElement('span');
                rSpan.className = `rating-badge ${API.getRatingClass(problem.rating)}`;
                rSpan.textContent = problem.rating;
                elements.detail.meta.appendChild(rSpan);
            }

            // Tags
            elements.detail.tags.innerHTML = '';
            if (problem.tags && problem.tags.length) {
                problem.tags.forEach(t => {
                    const pill = document.createElement('span');
                    pill.className = 'tag-pill';
                    pill.textContent = t;
                    elements.detail.tags.appendChild(pill);
                });
            }
        }
    };

    // --- Helpers ---
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Event Listeners ---
    elements.buttons.add.addEventListener('click', () => {
        elements.form.reset();
        elements.formTitle.textContent = 'Add Problem';
        Navigation.showForm();
    });

    elements.buttons.cancel.addEventListener('click', () => {
        // If we were editing a detail view item, go back to detail, else list
        if (currentDetailId) {
            const p = State.problems.find(x => x.id === currentDetailId);
            if (p) Navigation.showDetail(p);
            else Navigation.showList();
        } else {
            Navigation.showList();
        }
    });

    // New Listeners
    elements.buttons.back.addEventListener('click', () => {
        Navigation.showList();
    });

    // Filter Toggle
    elements.buttons.filterToggle = document.getElementById('filter-toggle-btn');
    elements.filterPanel = document.getElementById('filter-panel');
    elements.inputs.filterRating = document.getElementById('filter-rating');
    elements.inputs.filterTags = document.getElementById('filter-tags');

    if (elements.buttons.filterToggle) {
        elements.buttons.filterToggle.addEventListener('click', () => {
            elements.filterPanel.classList.toggle('hidden');
            elements.buttons.filterToggle.classList.toggle('active');
        });
    }

    const updateFilter = () => {
        State.render(); // Always render with current input values
    };

    elements.inputs.search.addEventListener('input', updateFilter);
    if (elements.inputs.filterRating) elements.inputs.filterRating.addEventListener('input', updateFilter);
    if (elements.inputs.filterTags) elements.inputs.filterTags.addEventListener('input', updateFilter);

    elements.buttons.detailEdit.addEventListener('click', () => {
        if (currentDetailId) State.startEdit(currentDetailId);
    });

    // Import/Export Listeners
    if (elements.buttons.export) {
        elements.buttons.export.addEventListener('click', () => State.exportData());
    }
    if (elements.buttons.import) {
        elements.buttons.import.addEventListener('click', () => elements.inputs.importFile.click());
    }
    if (elements.inputs.importFile) {
        elements.inputs.importFile.addEventListener('change', (e) => {
            if (e.target.files.length > 0) State.importData(e.target.files[0]);
            e.target.value = ''; // Reset
        });
    }

    // Ctrl+Enter to save
    elements.inputs.notes.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            elements.form.requestSubmit();
        }
    });

    elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        State.save(
            elements.inputs.link.value,
            elements.inputs.notes.value
        );
    });

    // Init
    State.load();
});
