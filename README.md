# CF Notes

**CF Notes** is a lightweight, efficient Chrome extension designed for competitive programmers. It allows you to track Codeforces problems, save personal notes/solutions, and organize your practice history directly from your browser.

## Overview

Competitive programming requires constant practice and reflection. CF Notes simplifies this by providing a dedicated space to jot down algorithms, key insights, or mistakes for any Codeforces problem. With automatic metadata fetching, your notes are always organized with the correct problem name, rating, and tags.

## Features

-   **Auto-Fetch Metadata**: Automatically retrieves problem details (Name, Rating, Tags) from Codeforces using the API.
-   **Rich Note Taking**: Save detailed notes about your approach or solution.
-   **Smart Search & Filter**: Instantly find problems by name, rating range, tags, or content within your notes.
-   **Import/Export**: Backup your data to JSON or transfer it between devices easily.
-   **Clean UI**: A modern, distraction-free interface built for speed and clarity.
-   **Local Privacy**: All data is stored locally in your browser's extensions storage.

## Prerequisites

-   A purely local installation requires a Chromium-based browser (Google Chrome, Microsoft Edge, Brave, etc.).
-   Node.js is **not** required (this is a vanilla HTML/JS extension).

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/mizzatfpa/cf-notes.git
    cd cf-notes
    ```

2.  **Load into Chrome:**
    -   Open your browser and navigate to `chrome://extensions`.
    -   Enable **Developer mode** (toggle switch in the top right corner).
    -   Click the **Load unpacked** button.
    -   Select the directory where you cloned `cf-notes`.

3.  **Pin the Extension:**
    -   Click the puzzle piece icon in your browser toolbar.
    -   Pin **CF Notes** for easy access.

## Usage

### Adding a Note
1.  Click the **CF Notes** icon.
2.  Click the **+ (Add)** button.
3.  Paste the **Codeforces Problem Link** (e.g., `https://codeforces.com/problemset/problem/4/A`).
4.  (Optional) The extension will auto-fetch the problem name and rating.
5.  Write your notes in the text area.
6.  Click **Save Note**.

### Searching & Filtering
-   **Search**: Type in the search bar to filter by problem name or note content.
-   **Filter**: Click the filter icon to expand options. Enter a specific rating (e.g., `1200`) or tags (e.g., `dp, greedy`).

### Importing/Exporting
-   Scroll to the bottom of the list.
-   Click **Export JSON** to save a backup of your notes.
-   Click **Import JSON** to restore notes from a file.

## Project Structure

```text
cf-notes/
├── icons/              # Extension icons (PNG)
├── manifest.json       # Chrome Extension configuration
├── popup.html          # Main interface structure
├── popup.js            # Core logic (API, Storage, UI)
├── style.css           # Styling and design system
└── README.md           # Documentation
```

## Contributing

Contributions are welcome! If you have ideas for new features or bug fixes:

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [https://github.com/mizzatfpa/cf-notes](https://github.com/mizzatfpa/cf-notes)
