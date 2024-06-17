/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

'use strict';

const { St, Gio, Clutter, Soup, GLib } = imports.gi;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

let panelButton;
let panelButtonText;
let session;
let dollarQuotation;
let sourceId = null;

// Initialize the extension
function init() {
    log(`Initializing ${Me.metadata.name}`);
}

// Enable the extension
function enable() {
    log(`Enabling ${Me.metadata.name}`);
    panelButton = new St.Bin({ style_class: 'panel-button' });
    panelButtonText = new St.Label({ text: 'loading...', y_align: Clutter.ActorAlign.CENTER });
    panelButton.set_child(panelButtonText);
    Main.panel._centerBox.insert_child_at_index(panelButton, 0);

    // Set up the Soup session
    session = new Soup.Session();

    handle_request_dollar_api();

    sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
        handle_request_dollar_api();
        return GLib.SOURCE_CONTINUE;
    });
}

// Disable the extension
function disable() {
    log(`Disabling ${Me.metadata.name}`);
    if (panelButton) {
        Main.panel._centerBox.remove_child(panelButton);
        panelButton.destroy();
        panelButton = null;
    }

    if (sourceId) {
        GLib.Source.remove(sourceId);
        sourceId = null;
    }

    if (session) {
        session.abort();
        session = null;
    }
}

// Handle Requests to API for Dollar Quotation
async function handle_request_dollar_api() {
    const url = 'https://economia.awesomeapi.com.br/last/USD-BRL';

    try {
        let message = Soup.Message.new('GET', url);
        let response = await new Promise((resolve, reject) => {
            session.queue_message(message, (session, message) => {
                if (message.status_code === Soup.Status.OK) {
                    resolve(message.response_body.data);
                } else {
                    reject(new Error(`HTTP error: ${message.status_code}`));
                }
            });
        });

        const bodyResponse = JSON.parse(response);
        let upDown = bodyResponse.USDBRL.varBid;
        dollarQuotation = bodyResponse.USDBRL.bid.split('.');
        dollarQuotation = `${dollarQuotation[0]},${dollarQuotation[1].substring(0, 2)}`;

        let upDownIcon = parseFloat(upDown) > 0 ? '⬆' : '⬇';
        panelButtonText.text = `USD ${dollarQuotation}) ${upDownIcon}`;
    } catch (error) {
        log(`Error in [handle_request_dollar_api]: ${error}`);
        panelButtonText.text = 'Error fetching data';
    }
}
