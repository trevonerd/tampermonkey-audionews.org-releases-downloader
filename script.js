// ==UserScript==
// @name         Audionews.org Releases Downloader
// @namespace    https://audionews.org
// @version      1.0.3
// @description  Download multiple torrents from Audionews.org
// @author       Marco Trevisani <marco.trevisani81@gmail.com>
// @match        https://audionews.org/tracker.php*
// @grant        GM_addStyle
// @require      http://code.jquery.com/jquery-latest.js
// ==/UserScript==

// OPTIONS
var downloadDelay = 500,
    seedClass = "seedmed",
    leechClass = "leechmed";

// CSS
GM_addStyle('#buttons-container { width: auto; height: 26px; line-height: 26px; float: right; }');
GM_addStyle('#buttons-label { float: left; font-size: 12px; margin-right: 10px; font-weight:bold; }');
GM_addStyle('.button-download { float: left; font-size: 11px; margin-right: 10px; }');

(function() {
    'use strict';

    // Private Functions
    var getCurrentMonthFormatted = function() {
        var date = new Date();
        return ("0" + (date.getMonth() + 1)).slice(-2);
    };

    var calculatePreviousMonthFormatted = function () {
        var date = new Date(),
            currentMonth = date.getMonth();
        if (currentMonth === 0) {
            currentMonth = 11;
        }
        return ("0" + (currentMonth)).slice(-2);
    };

    var getMonthFromReleaseDate = function(releaseDate) {
        var tempReleaseDate = releaseDate;
        var releaseDateFirstChar = releaseDate.substring(0, 1);

        if (releaseDateFirstChar !== "[") {
            return releaseDate.substring(0, 2);
        } else {
            return releaseDate.substring(1, 3);
        }
    };

    var appendButtons = function() {
        var $buttonsContainer = $("<div>", {
            id: "buttons-container"
        });

        var $buttonsLabel = $("<span>", {
            id: "buttons-label",
            text: "Download: "
        });

        var $buttonDownloadCurrentMonth = $("<a>", {
            class: "button-download",
            href: "#",
            text: "Current Month",
            "data-month": getCurrentMonthFormatted()
        });

        var $buttonDownloadPreviousMonth = $("<a>", {
            class: "button-download previous-month",
            href: "#",
            text: "Previous Month",
            "data-month": calculatePreviousMonthFormatted()
        });

        $buttonsContainer
            .append($buttonsLabel)
            .append($buttonDownloadCurrentMonth)
            .append($buttonDownloadPreviousMonth);

        $(".spacer_6").append($buttonsContainer);
    };

    var i = 0, howManyTorrents = 0;
    var prepareDownloads = function(month) {
        $("a[title='Download'").each( function(i) {
            var releaseDate = $(this).parent().prev().prev().prev().find("a").text();

            if (releaseDate === "") { releaseDate = $(this).parent().prev().prev().prev().text(); }

            var releaseMonth = getMonthFromReleaseDate(releaseDate),
                $torrentElement = $(this).parent().prev().prev().prev().prev().find("a"),
                alreadyDownloaded = $torrentElement.hasClass(seedClass) ||  $torrentElement.hasClass(leechClass);

            if (parseInt(releaseMonth) === month && !alreadyDownloaded) {
                $(this).addClass("download-now");
            }
        });

        howManyTorrents = $(".download-now").length;

        if (howManyTorrents > 0) { startDownload(); }
    };

    function startDownload() {
        var $downloadLink = $($(".download-now")[i]),
            torrentName = $downloadLink.parent().prev().prev().prev().prev().text();

        $(".download-now")[i].click();
        console.log("Downloading torrent (" + (i + 1) + "): " + torrentName);

        i++;
        if( i < howManyTorrents ){
            setTimeout( startDownload, downloadDelay );
        }
    }

    var initEvents = function() {
        $("#buttons-container").on("click", ".button-download", function(e) {
            e.preventDefault();
            $("a.download-now").removeClass("download-now");
            prepareDownloads($(this).data("month"));
        });
    };

    $(document).ready(function() {
        appendButtons();
        initEvents();
    });
}());
