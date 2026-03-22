import { html, LitElement } from 'lit';
import { DateTime, Settings as LuxonSettings } from 'luxon';
import styles from './card.styles';

export class MultitodoCard extends LitElement {
    static styles = styles;

    _initialized = false;
    _entities = {};
    _columns = 1;
    _dueColors = {};
    _almostDueDays = 3;
    _sorting = 'due asc';
    _completedBottom = true;
    _hide = {};
    _unsubscribeToTodoLists = [];
    _dateUpdateInterval = null;

    constructor() {
        super();

        this._config = null;
        this._items = [];
        this._loading = true;
    }

    /**
     * Get config element
     *
     * @returns {HTMLElement}
     */
    static getConfigElement() {
        // Create and return an editor element
        return document.createElement("multitodo-editor");
    }

    /**
     * Get stub config
     *
     * @returns {}
     */
    static getStubConfig() {
        return {
            entities: [],
            columns: 1,
            overdueColor: 'red',
            dueColor: 'orange',
            almostDueDays: 3,
            almostDueColor: 'yellow',
            sorting: 'due desc',
            completedBottom: true,
            hideOverdue: false,
            hideDue: false,
            hideAlmostDue: false,
            hideNotDue: false,
            hideNoDueDate: false,
            hideCompleted: false,
        };
    }

    /**
     * Get properties
     *
     * @return {Object}
     */
    static get properties() {
        return {
            hass: { type: Object, state: true },
            _config: { type: Object, state: true },
            _items: { type: Array, state: true },
            _loading: { Boolean, state: true }
        }
    }

    /**
     * Set configuration
     *
     * @param {Object} config
     */
    setConfig(config) {
        this._config = config;

        if (!config.entities || !Array.isArray(config.entities)) {
            throw new Error('No entities are configured');
        }
        if (config.locale) {
            LuxonSettings.defaultLocale = config.locale;
        }
        this._columns = config.columns ?? 1;
        this._dueColors = {
            overdue: config.overdueColor ?? 'red',
            due: config.dueColor ?? 'orange',
            almostDue: config.almostDueColor ?? 'yellow',
        };
        this._almostDueDays = config.almostDueDays ?? 3;
        this._sorting = config.sorting ?? 'due desc';
        this._completedBottom = config.completedBottom ?? true;
        this._hide = {
            overdue: config.hideOverdue ?? false,
            due: config.hideDue ?? false,
            almostDue: config.hideAlmostDue ?? false,
            notDue: config.hideNotDue ?? false,
            noDueDate: config.hideNoDueDate ?? false,
            completed: config.hideCompleted ?? false,
        }
    }

    connectedCallback() {
        super.connectedCallback();

        this._dateUpdateInterval = setInterval(() => {
            this.refreshDates();
        }, 60000);
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        this.unsubscribeToTodoLists();

        if (this._dateUpdateInterval) {
            clearInterval(this._dateUpdateInterval);
        }
    }

    firstUpdated(_changedProperties) {
        super.firstUpdated(_changedProperties);

        if (this.hass) {
            this.subscribeToTodoLists();
        }
    }

    updated(_changedProperties) {
        super.updated(_changedProperties);

        if (_changedProperties.has('_config')) {
            const oldConfig = _changedProperties.get('_config');

            const oldEntities = JSON.stringify(oldConfig?.entities || []);
            const newEntities = JSON.stringify(this._config?.entities || []);

            if (oldEntities !== newEntities && this.hass) {
                this.subscribeToTodoLists();
            }
        }

        if (_changedProperties.has('hass') && this.hass && !this._initialized) {
            this._initialized = true;
            this.subscribeToTodoLists();
        }
    }

    async subscribeToTodoLists() {
        if (!this.hass || !this._config?.entities.length) {
            return;
        }

        this.unsubscribeToTodoLists();

        await this.fetchItems();

        const entitiesToSubscribe = this._config.entities.map(e => e.entity);

        try {
            const subscribePromises = entitiesToSubscribe.map(entityId =>
                this.hass.connection.subscribeMessage(
                    (event) => this.handleUpdate(entityId, event),
                    {
                        type: 'todo/item/subscribe',
                        entity_id: entityId,
                    }
                )
            );

            this._unsubscribeToTodoLists = await Promise.all(subscribePromises);
        } catch (e) {
            console.error('Multitodo: Files to subscribe', e);
        }
    }

    unsubscribeToTodoLists() {
        if (this._unsubscribeToTodoLists) {
            this._unsubscribeToTodoLists.forEach(unsubscribeToTodoList => unsubscribeToTodoList());
            this._unsubscribeToTodoLists = [];
        }
    }

    handleUpdate(entityId, event) {
        if (event.items) {
            const newEntityItems = event.items.map(item =>
                this.transformItem(item, entityId)
            );

            this._items = [
                ...this._items.filter(item => item.entity !== entityId),
                ...newEntityItems
            ];

            return;
        }

        if (!event.action || !event.item) {
            return;
        }

        const { action, item } = event;
        const itemId = entityId + '-' + item.uid;
        let items = [...this._items];

        if (action === 'added') {
            items.push(this.transformItem(item, entityId));
        }

        if (action === 'updated') {
            items = items.map(existingItem => existingItem._id === itemId ? this.transformItem(item, entityId) : existingItem)
        }

        if (action === 'removed') {
            items = items.filter(existingItem => existingItem._id !== itemId);
        }

        this._items = items;
    }

    transformItem(item, entity) {
        return {
            ...item,
            entity: entity,
            dueData: this.findDateData(item.due ?? null, true),
            completedData: this.findDateData(item.completed ?? null),
            _id: entity + '-' + item.uid,
        };
    }

    get sortedAndFilteredItems() {
        let items = this._items;

        if (Object.values(this._hide).some(value => value === true)) {
            items = items.filter((item) => {
                if (item.status === 'completed' && this._hide.completed) {
                    return false;
                }

                return item.dueData.group === 'overdue' && !this._hide.overdue
                    || item.dueData.group === 'due' && !this._hide.due
                    || item.dueData.group === 'almostDue' && !this._hide.almostDue
                    || item.dueData.group === 'notDue' && !this._hide.notDue
                    || item.dueData.group === 'noDueDate' && !this._hide.noDueDate;
            });
        }

        return items.sort((a, b) => {
            if (this._completedBottom && a.status !== b.status) {
                return a.status === 'needs_action' ? -1 : 1;
            }

            switch (this._sorting) {
                case 'summary':
                    return a.summary.localeCompare(b.summary);
                case "due asc":
                    return (b.dueData?.dateTime?.toSeconds() ?? 999999999999) - (a.dueData?.dateTime?.toSeconds() ?? 999999999999);
                case "due desc":
                default:
                    return (a.dueData?.dateTime?.toSeconds() ?? 999999999999) - (b.dueData?.dateTime?.toSeconds() ?? 999999999999);
            }
        });
    }

    render() {
        if (this._loading) {
            return html`
                <ha-card class="multitodo">
                    <div class="card-content loading">
                        <ha-circular-progress active size="small"></ha-circular-progress>
                    </div>
                </ha-card>
            `;
        }

        const items = this.sortedAndFilteredItems;

        return html`
            <ha-card class="multitodo" style="--item-columns: ${this._columns}">
                <div class="card-content">
                    ${items.length > 0 ? html`
                        <ul class="items">
                            ${items.map(item => this.renderItem(item))}
                        </ul>
                        ` : `
                        <div class="noitems">
                            No items
                        </div>
                        `
                    }
                </div>
            </ha-card>
        `;
    }

    renderItem(item) {
        const completed = item.status === 'completed';

        let styles = [];
        if (!completed && this._dueColors[item.dueData.group]) {
            styles.push('--due-color: ' + this._dueColors[item.dueData.group]);
        }

        let classes = [
            item.dueData.group
        ];
        if (completed) {
            classes.push('completed');
        }

        return html`
            <li class="${classes.join(' ')}" data-entity="${item.entity}" data-due-group="${item.dueData.group}" style="${styles.join(';')}" @click="${(e) => this.handleStatusUpdate(e, item)}">
                <ha-icon icon="mdi:${completed ? 'checkbox-marked-outline' : 'checkbox-blank-outline'}"></ha-icon>
                <div class="data">
                    <div class="summary">${item?.summary ?? 'No title'}</div>
                    <div class="entity">
                        <ha-icon icon="${this._entities[item?.entity]?.icon}"></ha-icon>
                        ${this._entities[item?.entity]?.name}
                    </div>
                    ${item.dueData?.relative || item.completedData?.relative ? html`
                        <div class="due" title="${completed ? item.completedData.absolute : item.dueData.absolute}">
                            <ha-icon icon="mdi:clock"></ha-icon>
                            <span class="date">${completed ? item.completedData.relative : item.dueData.relative}</span>
                        </div>
                    ` : ''}
                </div>
            </li>
        `
    }

    async fetchItems() {
        this._loading = true;

        try {
            this._config.entities.forEach((entityConfig) => {
                if (
                    !entityConfig.entity
                    || !(entityConfig.entity in this.hass.states)
                ) {
                    return;
                }

                this._entities[entityConfig.entity] = {
                    entity: entityConfig.entity,
                    name: entityConfig.name ?? this.hass.formatEntityAttributeValue(this.hass.states[entityConfig.entity], 'friendly_name'),
                    icon: entityConfig.icon ?? 'mdi:clipboard-list',
                };
            });

            let items = [];
            for (let entityKey in this._config.entities) {
                const entityConfig = this._config.entities[entityKey];
                if (!entityConfig?.entity) {
                    continue;
                }

                let entityItems = await this.hass.callWS({
                    type: 'todo/item/list',
                    entity_id: entityConfig.entity,
                });
                items = items.concat(
                    (entityItems.items || []).map((item) => {
                        return this.transformItem(item, entityConfig.entity);
                    })
                );
            }

            this._items = items;
        } catch (e) {
            console.error('Multitodo: Error fetching items', e);
        } finally {
            this._loading = false;
        }
    }

    findDateData(dateString, isDueDate) {
        if (dateString === null) {
            return isDueDate ? { group: 'noDueDate' } : {};
        }

        const noTime = dateString.length === 10;

        let date = DateTime.fromISO(dateString);
        let now = noTime ? DateTime.now().startOf('day') : DateTime.now();

        let data = {
            relative: noTime
                ? date.toRelativeCalendar()
                : date.toRelative({
                    unit: ['years', 'months', 'weeks', 'days', 'hours', 'minutes'],
                }),
            absolute: date.toLocaleString(noTime ? DateTime.DATE_FULL : DateTime.DATETIME_FULL),
            dateTime: noTime ? date.endOf('day') : date,
        }

        if (isDueDate) {
            data.group = 'notDue';

            if (date < now) {
                data.group = 'overdue';
            } else if (date.startOf('day').equals(now.startOf('day'))) {
                data.group = 'due';
            } else if (date < now.plus({days: this._almostDueDays})) {
                data.group = 'almostDue';
            }
        }

        return data;
    }

    async handleStatusUpdate(event, item) {
        event.stopPropagation();
        await this.hass.callService(
            'todo',
            'update_item',
            {
                item: item.uid,
                status: item.status === 'completed' ? 'needs_action' : 'completed',
            }, {
                entity_id: item.entity,
            }
        );
    }

    refreshDates() {
        if (this._items.length === 0) return;

        this._items = this._items.map(item => ({
            ...item,
            dueData: this.findDateData(item.due ?? null, true),
            completedData: this.findDateData(item.completed ?? null),
        }));
    }
}
