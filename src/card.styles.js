import { css } from 'lit';

export default css`
    ha-card {
      border: none;
      background-color: transparent;
    }
    
    div.card-content {
      padding: 0;
    }
  
    div.card-content.loading {
      display: flex;
      justify-content: center;
      align-items: center;
    }
  
    div.noitems {
      text-align: center;
    }
  
    ul.items {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      gap: var(--ha-space-2);
      flex-wrap: wrap;
    }
  
    ul.items li {
      width: 100%;
      background: var(--ha-card-background, var(--card-background-color, #fff));
      backdrop-filter: var(--ha-card-backdrop-filter, none);
      box-shadow: var(--ha-card-box-shadow, none);
      box-sizing: border-box;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      border-width: var(--ha-card-border-width, 1px);
      border-style: solid;
      border-color: var(--due-color, var(--ha-card-border-color, var(--divider-color, #e0e0e0)));
      color: var(--primary-text-color);
      display: flex;
      transition: 0.3s ease-out;
      position: relative;
      padding: var(--ha-space-2);
      gap: var(--ha-space-2);
    }

    ul.items li.completed div.summary {
      text-decoration: line-through;
    }

    ul.items li div.entity,
    ul.items li div.due {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
      --mdc-icon-size: 14px;
    }

    ul.items li div.due span.date {
      display: inline-block;
    }
  
    ul.items li div.due span.date:first-letter {
      text-transform: uppercase;
    }
`;
