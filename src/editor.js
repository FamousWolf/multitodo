import { html, LitElement } from "lit";
import styles from './editor.styles';

export class MultitodoCardEditor extends LitElement {
    static styles = styles;

    connectedCallback() {
        super.connectedCallback();
        this.loadCustomElements();
    }

    async loadCustomElements() {
        if (!customElements.get("ha-entity-picker")) {
            await customElements.get("hui-entities-card").getConfigElement();
        }
    }

    static get properties() {
        return {
            hass: {},
            _config: {},
        };
    }

    setConfig(config) {
        this._config = config;
    }

    render() {
        if (!this.hass || !this._config) {
            return html``;
        }

        return html`
            <div style="display: flex; flex-direction: column">
                ${this.addExpansionPanel(
                    'Entities',
                    html`
                        ${this.getConfigValue('entities', []).map((entity, index) => {
                            return html`
                                ${this.addExpansionPanel(
                                    `Entity: ${entity.name ?? entity.entity}`,
                                    html`
                                        ${this.addEntityPickerField('entities.' + index + '.entity', 'Entity', ['todo'])}
                                        ${this.addTextField('entities.' + index + '.name', 'Name')}
                                        ${this.addIconPickerField('entities.' + index + '.icon', 'Icon')}
                                        ${this.addButton('Remove entity', 'mdi:trash-can', () => {
                                            const config = JSON.parse(JSON.stringify(this._config));
                                            if (config.entities.length === 1) {
                                                config.entities = [];
                                            } else {
                                                delete config.entities[index];
                                                config.entities = config.entities.filter(Boolean);
                                            }
                                            this._config = config;
                                            this.dispatchConfigChangedEvent();
                                        })}
                                    `
                                )}
                            `
                        })}
                        ${this.addButton('Add entity', 'mdi:plus', () => {
                            const index = this.getConfigValue('entities', []).length;
                            this.setConfigValue('entities.' + index, {});
                        })}
                    `
                )}
                ${this.addExpansionPanel(
                    'Appearance',
                    html`
                        ${this.addTextField('columns', 'Number of columns', 'number', 1)}
                    `
                )}
                ${this.addExpansionPanel(
                    'Due date',
                    html`
                        ${this.addTextField('overDueColor', 'Overdue color', 'text', 'red')}
                        ${this.addTextField('dueColor', 'Due color', 'text', 'orange')}
                        ${this.addTextField('almostDueDays', 'Almost due days', 'number', 3)}
                        ${this.addTextField('almostDueColor', 'Almost due color', 'text', 'yellow')}
                    `
                )}
                ${this.addExpansionPanel(
                    'Sorting and filter',
                    html`
                        ${this.addSelectField('sorting', 'Sorting', [
                            {
                                label: 'Due date ascending',
                                value: 'due asc',
                            }, {
                                label: 'Due date descending',
                                value: 'due desc',
                            }, {
                                label: 'Alphabetical',
                                value: 'summary',
                            }
                        ], false, 'due desc')}
                        ${this.addBooleanField('completedBottom', 'Always place completed at the bottom', true)}
                        ${this.addBooleanField('hideOverdue', 'Hide overdue', false)}
                        ${this.addBooleanField('hideDue', 'Hide due', false)}
                        ${this.addBooleanField('hideAlmostDue', 'Hide almost due', false)}
                        ${this.addBooleanField('hideNotDue', 'Hide not due', false)}
                        ${this.addBooleanField('hideNoDueDate', 'Hide no due date', false)}
                        ${this.addBooleanField('hideCompleted', 'Hide completed', false)}
                    `
                )}
            </div>
        `;
    }

    addTextField(name, label, type, defaultValue) {
        return html`
            <ha-textfield
                name="${name}"
                label="${label ?? name}"
                type="${type ?? 'text'}"
                value="${this.getConfigValue(name, defaultValue)}"
                @keyup="${this._valueChanged}"
                @change="${this._valueChanged}"
            />
        `;
    }

    addEntityPickerField(name, label, includeDomains, defaultValue) {
        return html`
            <ha-entity-picker
                .hass="${this.hass}"
                name="${name}"
                label="${label ?? name}"
                value="${this.getConfigValue(name, defaultValue)}"
                .includeDomains="${includeDomains}"
                @value-changed="${this._valueChanged}"
            />
        `;
    }

    addIconPickerField(name, label, defaultValue) {
        return html`
            <ha-icon-picker
                .hass="${this.hass}"
                name="${name}"
                label="${label ?? name}"
                value="${this.getConfigValue(name, defaultValue)}"
                @value-changed="${this._valueChanged}"
            />
        `;
    }

    addSelectField(name, label, options, clearable, defaultValue) {
        return html`
            <ha-select
                name="${name}"
                label="${label ?? name}"
                value="${this.getConfigValue(name, defaultValue)}"
                .clearable="${clearable}"
                @change="${this._valueChanged}"
                @closed="${(event) => { event.stopPropagation(); } /* Prevent a bug where the editor dialog also closes. See https://github.com/material-components/material-web/issues/1150 */}"
            >
                ${options.map((option) => {
                    return html`
                        <mwc-list-item
                            value="${option.value}"
                        >${option.label ?? option.value}</mwc-list-item>
                    `;
                })}
            </ha-select>
        `;
    }

    addBooleanField(name, label, defaultValue) {
        return html`
            <ha-formfield
                label="${label ?? name}"
            >
                <ha-switch
                    name="${name}"
                    .checked="${this.getConfigValue(name, defaultValue)}"
                    value="true"
                    @change="${this._valueChanged}"
                />
            </ha-formfield>
        `;
    }

    addExpansionPanel(header, content, expanded) {
        return html`
            <ha-expansion-panel
                header="${header}"
                .expanded="${expanded ?? false}"
                outlined="true"
            >
                <div style="display: flex; flex-direction: column">
                    ${content}
                </div>
            </ha-expansion-panel>
        `;
    }

    addButton(text, icon, clickFunction) {
        return html`
            <ha-button
                @click="${clickFunction}"
            >
                <ha-icon icon="${icon}"></ha-icon>
                ${text}
            </ha-button>
        `;
    }

    _valueChanged(event) {
        const target = event.target;
        let value = event.detail ? event.detail.value ?? target.value ?? '' : target.value ?? '';

        if (target.tagName === 'HA-SWITCH') {
            value = target.checked;
        }

        this.setConfigValue(target.attributes.name.value, value);
    }

    getConfigValue(key, defaultValue) {
        if (!this._config) {
            return '';
        }

        defaultValue = defaultValue ?? '';

        return key.split('.').reduce((o, i) => o[i] ?? defaultValue, this._config) ?? defaultValue;
    }

    setConfigValue(key, value) {
        const config = JSON.parse(JSON.stringify(this._config));
        const keyParts = key.split('.');
        const lastKeyPart = keyParts.pop();
        const lastObject = keyParts.reduce((objectPart, keyPart) => {
            if (!objectPart[keyPart]) {
                objectPart[keyPart] = {};
            }
            return objectPart[keyPart];
        }, config);
        if (value === '') {
            delete lastObject[lastKeyPart];
        } else {
            lastObject[lastKeyPart] = value;
        }
        this._config = config;

        this.dispatchConfigChangedEvent();
    }

    dispatchConfigChangedEvent() {
        const configChangedEvent = new CustomEvent("config-changed", {
            detail: { config: this._config },
            bubbles: true,
            composed: true,
        });
        this.dispatchEvent(configChangedEvent);
    }
}
