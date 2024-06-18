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
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

const Indicator = GObject.registerClass(
class Indicator extends PanelMenu.Button {
    _init() {
        super._init(0.0, `${Me.metadata.name} Indicator`, false);
        this.add_child(new St.Icon({
            icon_name: 'system-run-symbolic',
            style_class: 'system-status-icon',
        }));
    }
});

const panelButton = new St.Bin({ style_class: "panel-button" });
const panelButtonText = new St.Label();
panelButton.set_child(panelButtonText);
let dollarQuotation = 'N/A';
let sourceId = null;
let session = new Soup.SessionAsync();

function init() {
    log(`initializing ${Me.metadata.name}`);
}

function createPanelButton() {
    Main.panel._centerBox.insert_child_at_index(panelButton, 0);
}

function setUpdateTimer() {
    sourceId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 30, () => {
        handle_request_dollar_api();
        return GLib.SOURCE_CONTINUE;
    });
}

function enable() {
    log(`enabling ${Me.metadata.name}`);
    createPanelButton();
    handle_request_dollar_api();
    setUpdateTimer();
}

function disable() {
    if (sourceId) {
        GLib.source_remove(sourceId);
        sourceId = null;
    }
    panelButtonText.set_text('');
    Main.panel._centerBox.remove_child(panelButton);
    log(`disabling ${Me.metadata.name}`);
}

export default class IndicatorExampleExtension extends Extension {
    enable() {
        this._indicator = new Indicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (sourceId) {
            GLib.source_remove(sourceId);
            sourceId = null;
        }
        this._indicator.destroy();
        this._indicator = null;
    }
}

async function handle_request_dollar_api() {
    try {
        let message = new Soup.Message({ method: 'GET', uri: new Soup.URI('https://economia.awesomeapi.com.br/last/USD-BRL') });

        session.queue_message(message, (session, response) => {
            if (response.status_code !== Soup.KnownStatusCode.OK) {
                throw new Error(`HTTP error: ${response.status_code}`);
            }

            let jsonString = response.response_body.data.toString();
            let data = JSON.parse(jsonString);
            let bid = data.USDBRL.bid;

            dollarQuotation = bid.split('.').join(',').substring(0, 6);

            GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                panelButtonText.set_text(`USD ${dollarQuotation}`);
                return GLib.SOURCE_REMOVE;
            });
        });
    } catch (error) {
        log(`Error in handle_request_dollar_api: ${error}`);
        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            panelButtonText.set_text(`USD ${dollarQuotation}`);
            return GLib.SOURCE_REMOVE;
        });
    }
}
