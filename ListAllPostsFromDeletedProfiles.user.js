// ==UserScript==
// @name         List All Posts from Deleted Profiles
// @version      0.1
// @description  On an existing user's history page, add a link to view all deleted posts from them.
// @author       Spevacus
// @namespace    Spevacus
// @match        *://*.askubuntu.com/users/history/*
// @match        *://*.mathoverflow.net/users/history/*
// @match        *://*.serverfault.com/users/history/*
// @match        *://*.stackapps.com/users/history/*
// @match        *://*.stackexchange.com/users/history/*
// @match        *://*.stackoverflow.com/users/history/*
// @match        *://*.superuser.com/users/history/*
// @updateURL	 https://github.com/Spevacus/ListAllPostsFromDeletedProfiles/raw/main/ListAllPostsFromDeletedProfiles.user.js
// @downloadURL  https://github.com/Spevacus/ListAllPostsFromDeletedProfiles/raw/main/ListAllPostsFromDeletedProfiles.user.js
// @grant        none
// ==/UserScript==
/* global StackExchange, $ */

(async function() {
    'use strict';
    // Get deletion events in the last column of the table, "Comment". Gross selector but it works.
    // Ignoring the annotation class because of the User History Improvements script: https://github.com/samliew/SO-mod-userscripts/blob/master/README.md#user-history-improvements-
    let profileDeletionElements = $('.s-table:not(".annotation") td:nth-child(4) a[href^="/users/"]');
    if(profileDeletionElements.length > 0) {
        const $btn = createShowPostsButton();
        $('h2:contains("Previous user history")').append($btn);
        let deletedUserIds = getDeletedUserIds(profileDeletionElements);
        let deletedUserPosts = [];
        for (const id of deletedUserIds) {
            let posts = await getPostsFromDeletedUserId(id);
            if(posts.length) {
                deletedUserPosts.push(posts);
            }
        };
        let postCount = getPostCount(deletedUserPosts);
        $btn.on("click", () => {
            if ($('#deletedProfilePosts').is(':hidden')) {
                $('#showAllPosts').text(`Hide ${postCount} posts from ${profileDeletionElements.length} deleted profiles`).addClass('is-selected');
                $('#deletedProfilePosts').show();
            }
            else{
                $('#showAllPosts').text(`Show ${postCount} posts from ${profileDeletionElements.length} deleted profiles`).removeClass('is-selected');
                $('#deletedProfilePosts').hide();
            }
        });
        $btn.removeClass('is-loading');
        if(postCount === 0) {
            $btn.text("User's deleted profiles have no posts");
        }
        else {
            $btn.attr('aria-disabled','false');
            $btn.text(`Show ${postCount} posts from ${profileDeletionElements.length} deleted profiles`);
            $('h2:contains("Previous user history")').after(generateTable(deletedUserPosts));
        }
    }
})();

function createShowPostsButton() {
    const $btn = $(`<button class="s-btn s-btn__filled is-loading">Loading deleted profile posts...</button>`);
    $btn.attr('id', 'showAllPosts');
    $btn.attr('aria-disabled','true');
    $btn.css('float', 'right');
    return $btn;
}

function getDeletedUserIds(deletionEventElements) {
    let userIds = [];
    const regexForId = /\d+/g;
    deletionEventElements.each(function(index, element) {
        userIds.push(element.href.match(regexForId));
    });
    return userIds;
}

async function getPostsFromDeletedUserId(id) {
    const response = await $.get(`/admin/posts-by-deleted-user/${id}`);
    let $html = $(response);
    let posts = [];

    $html.find('#posts tbody tr').each((_, element) => {
        let row = $(element).children();
        posts.push({
            postTitle: row[0].innerText,
            postHref: row[0].querySelector('a')?.href || '',
            postType: row[1].innerText,
            postScore: row[2].innerText,
            postDate: row[3].innerText,
            postDeleted: row[4].innerText === "Yes",
            authorId: id
        });
    });

    return posts;
}

function getPostCount(jsonData) {
    let postCount = 0;
    $.each(jsonData, function(index, postsArray) {
        postCount += postsArray.length;
    })
    return postCount;
}

function generateTable(jsonData) {
    let table = $('<table>');
    table.addClass('s-table');
    table.addClass('s-table__stripes');
    table.css("margin-bottom","20px");
    table.attr('id','deletedProfilePosts');

    let thead = $('<thead>');
    let tbody = $('<tbody>');
    let headers = ['Post Title', 'Post Type', 'Score', 'Post Date', 'Deletion Stub'];
    let headerRow = $('<tr>');

    $.each(headers, function(index, header) {
        headerRow.append($('<th>').text(header));
    });

    thead.append(headerRow);
    table.append(thead);

    $.each(jsonData, function(index, group) {
        $.each(group, function(i, post) {
            let row = $('<tr>');
            if(post.postDeleted) {
                row.append($('<td>').append(createDeletedBadge()).append($('<a>').attr('href', post.postHref).text(post.postTitle)));
            }
            else {
                row.append($('<td>').append($('<a>').attr('href', post.postHref).text(post.postTitle)));
            }
            row.append($('<td>').text(post.postType));
            row.append($('<td>').text(post.postScore));
            row.append($('<td>').text(post.postDate).addClass('w10'));
            row.append($('<td>').append($('<a>').attr('href', `/users/${post.authorId}`).text(`user${post.authorId}`)));

            tbody.append(row);
        });
    });

    table.append(tbody);
    table.hide();
    return table;
}

function createDeletedBadge() {
    let $badge = $('<span>', {
        class: "s-badge s-badge__sm bg-red-500 fc-white bc-transparent mr2"
    });
    // Really gross svg definition, stolen from review history
    let $svg = $(`
        <svg aria-hidden="true" class="mr4 mln1 svg-icon iconTrashSm" width="14" height="14" viewBox="0 0 14 14">
            <path d="M11 2a1 1 0 0 1 1 1v1H2V3a1 1 0 0 1 1-1h2a1 1 0 1 1 1-1h2a1 1 0 0 1 1 1zm0 3H3v6c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2z"></path>
        </svg>
    `);
    let $textSpan = $('<span>', {
        class: "mln1",
        text: "Deleted"
    });
    $badge.append($svg, $textSpan);
    return $badge;
}
