import { html, render, Component } from 'https://unpkg.com/htm/preact/standalone.mjs';

import Solitare from './solitare.js';

class Item extends Component {
  constructor(props){
    super(props);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }
  handleMouseDown(event){
    event.preventDefault();
    const { altKey, ctrlKey, metaKey, shiftKey } = event;
    const { item } = this.props;
    item.pick({ altKey, ctrlKey, metaKey, shiftKey });
  }
  handleMouseUp(){
    const { altKey, ctrlKey, metaKey, shiftKey } = event;
    const { item } = this.props;
    item.place({ altKey, ctrlKey, metaKey, shiftKey });
  }
  render({ item, image, ...props }){
    return html`<use ...${props}
      xlinkHref=${image}
      width=${item.width} height=${item.height}
      class=${`Card ${item.stack === item.game.holdingStack ? '' : 'animated'}`}
      onMouseDown=${this.handleMouseDown}
      onMouseUp=${this.handleMouseUp}
    />`;
  }
}

class TableGames extends Component {
  constructor(props) {
    super(props);

    this.state = { holding: { dx: 0, dy: 0 } };
    this.dragStart = { x: 0, y: 0 };

    this.startSolitare();

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.startSolitare = this.startSolitare.bind(this);
  }

  async startSolitare(){
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = null;
    this.game = new Solitare();
    this.unsubscribe = this.game.subscribe(() => this.forceUpdate());
    this.forceUpdate();
  }

  handleMouseDown({ x, y, target: { tagName } }){
    if (tagName !== 'use') return;
    this.dragStart = { x, y };
    this.setState({ holding: { dx: 0, dy: 0 } });
  }
  handleMouseMove(event){
    if (this.game.holdingStack.items.length === 0) return;
    const { x, y } = event;
    this.setState({ holding: {
      dx: x - this.dragStart.x,
      dy: y - this.dragStart.y
    } });
  }
  handleMouseUp(event){
    this.game.holdingStack.reset();
  }

  render({}, { holding: { dx, dy } }) {
    const scale = this.svgEl && this.svgEl.getScreenCTM().a;
    const items = [];
    function addItem(item){
      const heald = item.stack === this.game.holdingStack;
      if (heald) {
        items.push(html`<${Item} key=${item.id} style=${{pointerEvents: 'none'}} x=${item.x + dx/scale} y=${item.y + dy/scale} image=${item.image} item=${item} />`);
      } else {
        items.push(html`<${Item} key=${item.id} x=${item.x} y=${item.y} image=${item.image} item=${item} />`);
      }
      if (item.items) item.items.forEach(addItem, this);
    }
    this.game.items.forEach(addItem, this);
    return html `<div style=${{height: '100%', width: '100%'}}>
      <div style=${{position: 'absolute', bottom: 0}}>
        <button onClick=${this.startSolitare}>Solitare</button>
      </div>
      <svg
        style=${{height: '100%', width: '100%', fontSize: 12}}
        viewBox=${`0 0 ${this.game.width} ${this.game.height}`}
        ref=${el => this.svgEl = el}
        onMouseDown=${this.handleMouseDown}
        onMouseMove=${this.handleMouseMove}
        onMouseUp=${this.handleMouseUp}
      >
        ${items}
      </svg>
    </div>`;
  }
}
const root = document.createElement('div');
document.body.appendChild(root);
root.style = "height: 100%; width: 100%;"
render(html`<${TableGames} />`, root);