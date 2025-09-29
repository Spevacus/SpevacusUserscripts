// ==UserScript==
// @name         Add Multiple Users to Chat Access List
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       Spevacus
// @match        https://chat.stackoverflow.com/rooms/info/*/*?tab=access*
// @match        https://chat.stackexchange.com/rooms/info/*/*?tab=access*
// @match        https://chat.meta.stackexchange.com/rooms/info/*/*?tab=access*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=stackexchange.com
// @grant        none
// ==/UserScript==
/* globals StackExchange, $ */

(function() {
    'use strict';
    let fkey = $('#fkey').val()
    $(document).on("click", ".add-user-button", function () {
        setTimeout(() => {
            let $form = $('form[action*="/rooms/setuseraccess"]').first();

            if ($form.length) {
                let $formButton = $form.find('input.button').first();
                let originalText = $formButton.val();
                if (originalText.toLowerCase().includes("make owner")) {
                    // Do not allow bulk owner access changes
                    return;
                }
                let $block = $(`
                <p>
                    <strong>Bulk Add Users</strong>:
                    Input a list of comma-delimited user IDs into the text box to ${originalText} in bulk.<br>
                    <input type="text" name="bulkUserIDAccess" />
                    <span class="button bulk-button" style="margin: 8px 0; display: inline-block;">bulk ${originalText}</span>
                </p>
            `);
             $form.after($block);
             let host = window.location.host;
             let match = window.location.pathname.match(/\/rooms\/info\/(\d+)\//);
             let roomId = match ? match[1] : null;

             if (!roomId) {
                 console.error("Could not determine room ID from URL.");
                 return;
             }

             let requestUrl = `https://${host}/rooms/setuseraccess/${roomId}`;
             $block.find(".bulk-button").on("click", async function () {
                 let raw = $block.find('input[name="bulkUserIDAccess"]').val() || "";

                 // Trim whitespace around commas, collapse multiple commas
                 let cleaned = raw.replace(/\s+/g, "");

                 // Validate: only digits and commas allowed
                 if (!/^[0-9,]*$/.test(cleaned)) {
                     alert("Invalid input: only numbers, commas, and whitespace are allowed.");
                     return;
                 }

                 // Extract IDs
                 let ids = cleaned.split(",").filter(x => x.length > 0);

                 if (ids.length === 0) {
                     alert("Please enter at least one user ID.");
                     return;
                 }

                 let accessType = (originalText.toLowerCase().includes("write"))
                 ? "read-write"
                 : "read-only";
                 let successCount = 0;
                 let failCount = 0;

                 for (let userId of ids) {
                     try {
                         let resp = await fetch(requestUrl, {
                             method: "POST",
                             headers: {
                                 "Content-Type": "application/x-www-form-urlencoded",
                                 "Accept": "application/json, text/javascript, */*; q=0.01"
                             },
                             credentials: "include",
                             body: `fkey=${encodeURIComponent(fkey)}&aclUserId=${encodeURIComponent(userId)}&userAccess=${encodeURIComponent(accessType)}`
                         });

                         if (resp.ok) {
                             successCount++;
                             console.log(`Updated user ${userId} to ${accessType}`);
                         } else {
                             failCount++;
                             console.warn(`Failed for user ${userId} — HTTP ${resp.status}`);
                         }
                     } catch (err) {
                         failCount++;
                         console.error(`Failed for user ${userId}`, err);
                     }
                 }

                 alert(`Processed adding ${ids.length} user(s).\n\n Successes: ${successCount}\n Failures: ${failCount}`);

                 // Refresh after alert is dismissed
                 location.reload();
                });
            }
        }, 10);
    });
})();
