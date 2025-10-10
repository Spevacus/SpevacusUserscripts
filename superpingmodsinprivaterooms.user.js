// ==UserScript==
// @name         Superping Mods on a Site's Private Room
// @version      2025-10-10
// @description  When viewing a private chatroom room that's parented to a site, add a button to insert superpings into the chatbox.
// @author       Spevacus
// @match        https://chat.stackoverflow.com/rooms/*
// @match        https://chat.stackexchange.com/rooms/*
// @match        https://chat.meta.stackexchange.com/rooms/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==
/* globals $ */

(async function() {
    let isPrivateRoom = $('#roomtitle span').hasClass('sprite-sec-private');
    // Private rooms on chat.SE are typically mod rooms where we want to be able to super-ping mods if they are parented to a site.
    // Private rooms on chat.SO and chat.meta.SE are typically ones we want to target at all times.
    let siteRoomsLink = $('#siterooms');

    // Variable to hold the parent site value
    let parentSite = null;

    if (siteRoomsLink.length > 0) {
        let href = siteRoomsLink.attr('href');
        let params = new URLSearchParams(href.split('?')[1]);
        parentSite = params.get('host');
    }
    else
    {
        parentSite = window.location.hostname.replace(/^chat\./, '');
    }
    let isParentedToSite =
        $('#siterooms').length > 0 ||
        window.location.hostname === 'chat.stackoverflow.com' ||
        window.location.hostname === 'chat.meta.stackexchange.com';
    if(isPrivateRoom && isParentedToSite) {
        let $button = $('<button>', {
            class: 'button disabled',
            id: 'append-mod-pings',
            disabled: true,
            title: 'Loading superpings...'
        });
        // Spinner element to indicate things are loading
        let $spinner = $('<span>', {
            class: 'spinner',
            css: {
                display: 'inline-block',
                width: '6px',
                height: '6px',
                border: '1px solid #fff',
                borderTop: '1px solid transparent',
                borderRadius: '50%',
                marginRight: '5px',
                animation: 'spin 1s linear infinite'
            }
        });
        $button.append($spinner, 'add mod superpings');

        $('<style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style>').appendTo('head');

        $('#chat-buttons').append($button);
        let siteName = parentSite.replace(/\.com$/, '');
        let userIds = await fetchModUserIds(siteName);
        if(userIds.length <= 0) {
            $button.hide();
        }
        let superPings = await Promise.all(userIds.map(u => getChatMention(`${u}@${parentSite}`)));
        let pingString = superPings.filter(Boolean).join(' ');

        $button.prop('disabled', false)
           .attr('title', `Prepend superpings to ${siteName}'s mods in the chatbox`)
           .attr('class','button')
           .find('.spinner').remove();
        $button.on('click', function() {
            let $chatinput = $('#input');
            let current = $chatinput.val().trim();
            $chatinput.val(pingString + (current ? ' ' + current : '')).focus();
        });
    }
})();

async function fetchModUserIds(siteUrl) {
    const apiUrl = `https://api.stackexchange.com/2.3/users/moderators?site=${siteUrl}`;
    const key = 'rl_jVbX6ubQ7jpbhD4chLoUsSXCF';
    const response = await fetch(`${apiUrl}&key=${key}`);

    const resultUsers = await response.json();
    let userIds = [];
    for (let user of resultUsers.items) {
        if(user.is_employee === false && user.user_id !== -1) {
            userIds.push(user.user_id);
        }
    }
    return userIds;
}

function getChatMention(query) {
    return new Promise((resolve, reject) => {
        const url = `https://${window.location.hostname}/users/superping-search?q=${query}`;
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            headers: {
                "accept": "application/json",
                "x-requested-with": "XMLHttpRequest"
            },
            onload: (response) => {
                try {
                    const data = JSON.parse(response.responseText);
                    if (data?.users?.length > 0) {
                        resolve(`@${data.users[0].mention}`);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    reject(e);
                }
            },
            onerror: (err) => reject(err)
        });
    });
}
