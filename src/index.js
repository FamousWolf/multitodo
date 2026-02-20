import { MultitodoCard } from './card';
import { MultitodoCardEditor } from "./editor";
import { version } from '../package.json';

customElements.define(
    'multitodo-card',
    MultitodoCard
);

window.customCards = window.customCards || [];
window.customCards.push({
    type: 'multitodo-card',
    name: 'Multi Todo Card',
    description: 'Custom Home Assistant card displaying a list of todo tasks from multiple entities'
});

customElements.define(
    'multitodo-editor',
    MultitodoCardEditor
);

console.info(
    `%c MULTITODO-CARD %c v${version} `,
    'color: white; background: black; font-weight: 700;',
    'color: black; background: white; font-weight: 700;',
);