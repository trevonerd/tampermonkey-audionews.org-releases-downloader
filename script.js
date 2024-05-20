// ==UserScript==
// @name         Audionews.org Releases Downloader
// @namespace    https://audionews.org
// @version      3.0.0
// @description  Download multiple torrents with one click from Audionews.org
// @author       Marco Trevisani <marco.trevisani81@gmail.com>
// @match        https://audionews.org/tracker.php*
// @grant        GM_addStyle
// ==/UserScript==

// OPTIONS
const downloadDelay = 500;
const seedClass = 'seedmed';
const leechClass = 'leechmed';

// CSS
GM_addStyle(`
    #buttons-container { width: auto; height: 26px; line-height: 26px; float: right; margin-top: 15px; }
    #buttons-label { float: left; font-size: 12px; margin-right: 10px; font-weight: bold; }
    .button-download { float: left; font-size: 11px; margin-right: 12px; }
    .current-month { color: #0061FF; }
`);

(function() {
    'use strict';

    console.log("Audionews.org Releases Downloader script is now active!");

    // Private Functions
    const getCurrentMonthFormatted = () => ("0" + (new Date().getMonth() + 1)).slice(-2);
    const getCurrentMonth = () => new Date().getMonth() + 1;
    const getMonthName = (month) => new Date(new Date().setMonth(month - 1)).toLocaleString("en-us", { month: "long" });
    const getMonthFormatted = (month) => ("0" + month).slice(-2);
    const getMonthFromReleaseDate = (releaseDate) => releaseDate.charAt(0) === '[' ? releaseDate.substring(1, 3) : releaseDate.substring(0, 2);

    const generateDownloadMonthButton = (month) => {
        const anchor = document.createElement('a');
        anchor.className = `button-download${getCurrentMonth() === month ? ' current-month' : ''}`;
        anchor.href = "#";
        anchor.textContent = getMonthName(month);
        anchor.dataset.month = getMonthFormatted(month);
        return anchor;
    };

    const appendButtons = () => {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.id = 'buttons-container';
        buttonsContainer.appendChild(Object.assign(document.createElement('span'), { id: 'buttons-label', textContent: 'Download: ' }));

        for (let m = 1; m <= 12; m++) {
            buttonsContainer.appendChild(generateDownloadMonthButton(m));
        }

        document.querySelector('.spacer_6').appendChild(buttonsContainer);
    };

    let i = 0, howManyTorrents = 0;
    const prepareDownloads = (month) => {
        document.querySelectorAll("a[title='Download']").forEach(link => {
            const releaseDate = link.closest('td').previousElementSibling.previousElementSibling.previousElementSibling.textContent;
            const releaseMonth = getMonthFromReleaseDate(releaseDate);
            const torrentElement = link.closest('td').previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling.querySelector('a');
            const alreadyDownloaded = torrentElement.classList.contains(seedClass) || torrentElement.classList.contains(leechClass);

            if (parseInt(releaseMonth) === parseInt(month) && !alreadyDownloaded) {
                link.classList.add("download-now");
            }
        });

        howManyTorrents = document.querySelectorAll('.download-now').length;

        console.log(`Prepared to download ${howManyTorrents} torrents for month: ${getMonthName(month)}.`);

        if (howManyTorrents > 0) startDownload();
    };

    const startDownload = () => {
        const downloadLink = document.querySelectorAll('.download-now')[i];
        const torrentName = downloadLink.closest('td').previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling.textContent;

        downloadLink.click();
        downloadLink.closest('td').previousElementSibling.previousElementSibling.previousElementSibling.previousElementSibling.querySelector('a').style.color = 'magenta';
        console.log(`Downloading torrent (${i + 1}): ${torrentName}`);

        i++;
        if (i < howManyTorrents) {
            setTimeout(startDownload, downloadDelay);
        }
        else {
            console.log("Download initiation complete for all selected torrents.");
        }
    };

    const initEvents = () => {
        document.getElementById('buttons-container').addEventListener('click', (e) => {
            if (e.target.className.includes('button-download')) {
                e.preventDefault();
                document.querySelectorAll('.download-now').forEach(elem => elem.classList.remove('download-now'));
                prepareDownloads(e.target.dataset.month);
            }
        });
    };

    appendButtons();
    initEvents();
})();
