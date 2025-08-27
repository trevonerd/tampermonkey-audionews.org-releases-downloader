// ==UserScript==
// @name         Audionews.org Releases Downloader
// @namespace    https://audionews.org
// @version      3.1.1
// @description  Download multiple torrents with one click from Audionews.org.
// @author       Marco Trevisani <marco.trevisani81@gmail.com>
// @match        https://audionews.org/tracker.php*
// @grant        GM_addStyle
// ==/UserScript==

(function() {

    'use strict';

    // ----- CONFIGURATION AND STYLE -----

    const downloadDelay = 500; // Delay in ms between each automatic download
    const seedClass = 'seedmed'; // CSS class for already seeded torrents
    const leechClass = 'leechmed'; // CSS class for already leeched torrents

    // Inject persistent row highlight (fuchsia) and UI styles using rem units
    GM_addStyle(`
        :root {
            --an-progress-bg: #e1e1e1;
            --an-border-color: #bbb;
            --an-bar-radius: 0.25rem;
            --an-bar-height: 1.375rem;
            --an-bar-fill: #4CAF50;
            --an-bar-warning: #FFA500;
            --an-text-label: #0061FF;
            --an-text-main: #222;
            --an-text-muted: #666;
            --an-row-fuchsia: #f400A1;
        }
        .spacer_6 { display: grid; margin-bottom: 5rem !important; }
        #buttons-container { width: auto; height: 1.625rem; line-height: 1.625rem; float: right; margin-top: 0.5rem; }
        #buttons-label { float: left; font-size: 0.8125rem; margin-right: 0.625rem; font-weight: bold; }
        .button-download { float: left; font-size: 0.75rem; margin-right: 0.75rem; }
        .current-month { color: var(--an-text-label); }
        .downloaded-row-fuchsia > td > a {
            color: var(--an-row-fuchsia) !important;
            transition: color 0.3s;
        }
        #progress-container {
            display: block;
            width: 100%;
            background: none !important;
            box-sizing: border-box;
            border: none !important;
            border-radius: 0;
            margin: 0 0 0.125rem 0 !important;
            padding: 0 !important;
            position: relative;
        }
        #progress-bar-outer {
            width: 100%;
            height: var(--an-bar-height);
            background: var(--an-progress-bg);
            border: 1px solid var(--an-border-color);
            border-radius: var(--an-bar-radius);
            position: relative;
            overflow: hidden;
        }
        #progress-bar-fill {
            height: 100%;
            background-color: var(--an-bar-fill);
            border-radius: var(--an-bar-radius) 0 0 var(--an-bar-radius);
            width: 0%;
            transition: width 0.3s;
            position: absolute;
            left: 0;
            top: 0;
        }
        #progress-bar-fill.no-torrents {
            background-color: var(--an-bar-warning);
        }
        #progress-text {
            position: absolute;
            width: 100%;
            height: var(--an-bar-height);
            left: 0;
            top: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-weight: bold;
            color: var(--an-text-main);
            font-size: 0.875rem;
            z-index: 2;
            pointer-events: none;
            background: transparent !important;
            user-select: none;
        }
        #progress-status {
            font-size: 0.6875rem;
            text-align: left;
            color: var(--an-text-muted);
            font-weight: bold;
            margin-top: 0.625rem;
            margin-bottom: 0;
            position: relative;
        }
    `);

    // ----- UTILITY FUNCTIONS -----

    /**
     * Returns the current month as a number (1-12).
     */
    const getCurrentMonth = () => new Date().getMonth() + 1;

    /**
     * Returns the month name given a numeric month (1-12).
     * @param {number} month
     */
    const getMonthName = (month) =>
        new Date(new Date().setMonth(month - 1)).toLocaleString("en-us", { month: "long" });

    /**
     * Returns a two-digit-month string.
     * @param {number} month
     */
    const getMonthFormatted = (month) => ("0" + month).slice(-2);

    /**
     * Extracts month as string ("01"..."12") from release date text.
     * Handles date format: "[MM..." or "MM..."
     * @param {string} releaseDate
     */
    const getMonthFromReleaseDate = (releaseDate) =>
        releaseDate.charAt(0) === '[' ? releaseDate.substring(1, 3) : releaseDate.substring(0, 2);

    /**
     * Gets the table row (<tr>) containing the provided download link.
     * @param {HTMLElement} link
     */
    function getTorrentRowFromLink(link) {
        return link && link.closest('tr');
    }

    /**
     * Adds the highlight for a row if not already present.
     * @param {HTMLElement} link
     */
    function markRowDownloaded(link) {
        const row = getTorrentRowFromLink(link);
        if (row && !row.classList.contains('downloaded-row-fuchsia')) {
            row.classList.add('downloaded-row-fuchsia');
        }
    }

    // ----- UI CREATION & INITIALIZATION -----

    /**
     * Appends the toolbar and progress bar UI to the page.
     */
    function appendInterface() {
        const root = document.querySelector('.spacer_6');
        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'buttons-container';

        const label = document.createElement('span');
        label.id = 'buttons-label';
        label.textContent = 'Download: ';
        buttonsContainer.appendChild(label);

        // Generate a button for each month (January to December)
        for (let m = 1; m <= 12; m++) {
            const anchor = document.createElement('a');
            anchor.className = `button-download${getCurrentMonth() === m ? ' current-month' : ''}`;
            anchor.href = "#";
            anchor.textContent = getMonthName(m);
            anchor.dataset.month = getMonthFormatted(m);
            buttonsContainer.appendChild(anchor);
        }
        root.appendChild(buttonsContainer);

        // Setup progress bar container
        const progressContainer = document.createElement('div');
        progressContainer.id = 'progress-container';

        // Progress bar background
        const progressBarOuter = document.createElement('div');
        progressBarOuter.id = 'progress-bar-outer';

        // Progress bar fill
        const progressBarFill = document.createElement('div');
        progressBarFill.id = 'progress-bar-fill';
        progressBarOuter.appendChild(progressBarFill);

        // Progress text (centered)
        const progressText = document.createElement('div');
        progressText.id = 'progress-text';
        progressText.textContent = '0%';
        progressBarOuter.appendChild(progressText);

        progressContainer.appendChild(progressBarOuter);

        // Status text below the progress bar
        const progressStatus = document.createElement('div');
        progressStatus.id = 'progress-status';
        progressStatus.textContent = 'Ready to download...';
        progressContainer.appendChild(progressStatus);

        root.appendChild(progressContainer);
    }

    /**
     * Resets the progress bar and status to the idle state.
     */
    function resetProgressBarIdle() {
        document.getElementById('progress-status').textContent = 'Ready to download...';
        updateProgressBarVisual(0, 0);
    }

    /**
     * Updates the progress bar fill and percentage text.
     * @param {number} current - The current progress count.
     * @param {number} total - The total number of items.
     * @param {boolean} notorrents - If true, displays the 'No torrents found' state.
     */
    function updateProgressBarVisual(current, total, notorrents) {
        const fill = document.getElementById('progress-bar-fill');
        const text = document.getElementById('progress-text');
        if (notorrents) {
            fill.style.width = '100%';
            fill.classList.add('no-torrents');
            text.textContent = 'No torrents found';
        } else if (total === 0) {
            fill.style.width = '0%';
            fill.classList.remove('no-torrents');
            text.textContent = '0%';
        } else {
            fill.classList.remove('no-torrents');
            const perc = Math.round(100 * current / total);
            fill.style.width = perc + '%';
            text.textContent = perc + '%';
        }
    }

    // ----- DOWNLOAD PREPARATION AND HANDLING -----

    let i = 0, howManyTorrents = 0;

    /**
     * Selects all eligible download links for a given month and begins the automated download process.
     * Only torrents that are not yet seeded or leeched will be downloaded.
     * @param {string} month - The two-digit month (e.g., "04").
     */
    function prepareDownloads(month) {
        i = 0;
        // Remove previous batch markers (does NOT reset row highlighting)
        document.querySelectorAll('.download-now').forEach(elem => elem.classList.remove('download-now'));
        let found = 0;
        document.querySelectorAll("a[title='Download']").forEach(link => {
            const releaseDate = link.closest('td').previousElementSibling.previousElementSibling.previousElementSibling.textContent;
            const releaseMonth = getMonthFromReleaseDate(releaseDate);
            const torrentElement = link.closest('td').previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling.querySelector('a');
            const alreadyDownloaded = torrentElement.classList.contains(seedClass) || torrentElement.classList.contains(leechClass);
            if (parseInt(releaseMonth) === parseInt(month) && !alreadyDownloaded) {
                link.classList.add("download-now");
                found++;
            }
        });
        howManyTorrents = found;

        const statusDiv = document.getElementById('progress-status');
        if (howManyTorrents > 0) {
            updateProgressBarVisual(0, howManyTorrents);
            statusDiv.textContent = `Found ${howManyTorrents} torrents for ${getMonthName(parseInt(month))}. Starting download...`;
            setTimeout(startDownload, 500);
        } else {
            updateProgressBarVisual(0, 0, true);
            statusDiv.textContent = `No new torrents found for ${getMonthName(parseInt(month))}.`;
        }
    }

    /**
     * Sequentially downloads all batch links for the current cycle,
     * highlighting (persistently) each row when downloaded.
     */
    function startDownload() {
        const downloadLinks = document.querySelectorAll('.download-now');
        const downloadLink = downloadLinks[i];
        if (!downloadLink) return;
        // Mark row as downloaded (fuchsia)
        markRowDownloaded(downloadLink);
        // Trigger the download via click
        downloadLink.click();
        updateProgressBarVisual(i + 1, howManyTorrents);
        const statusDiv = document.getElementById('progress-status');
        statusDiv.textContent = `Downloading ${i + 1} of ${howManyTorrents} torrents...`;
        i++;
        if (i < howManyTorrents) {
            setTimeout(startDownload, downloadDelay);
        } else {
            updateProgressBarVisual(howManyTorrents, howManyTorrents);
            statusDiv.textContent = `Completed downloading ${howManyTorrents} torrents!`;
        }
    }

    /**
     * Registers event handlers for download buttons and month selection.
     * Adds row highlight for every manual click on "Download".
     */
    function initEvents() {
        // Highlight every row that is manually clicked for download
        document.querySelectorAll("a[title='Download']").forEach(link => {
            link.addEventListener('click', function() {
                markRowDownloaded(this);
            }, false);
        });

        // Handle month bar click events for automated batch download
        document.getElementById('buttons-container').addEventListener('click', (e) => {
            if (e.target.className.includes('button-download')) {
                e.preventDefault();
                resetProgressBarIdle();
                prepareDownloads(e.target.dataset.month);
            }
        });
    }

    // ----- MAIN SCRIPT INITIALIZATION -----

    appendInterface();
    resetProgressBarIdle();
    initEvents();

})();
