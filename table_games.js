import { html, render, Component } from 'https://unpkg.com/htm/preact/standalone.mjs';

import Solitare from './solitare.js';

class Item extends Component {
  constructor(props){
    super(props);
    this.state = { x: props.x, y: props.y };
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
  shouldComponentUpdate(nextProps, nextState){
    const { x, y, image } = this.props;
    const didChange =
      x !== nextProps.x || y !== nextProps.y || image !== nextProps.image ||
      this.state.x !== nextState.x || this.state.y !== nextState.y;
    return didChange;
  }
  componentWillUpdate(props, state){
    setTimeout(() => {
      this.setState({ x: props.x, y: props.y });
    });
  }
  render({ item, image, x: _x, y: _y, ...props }, { x, y }){
    return html`<use ...${props}
      xlinkHref=${image}
      x=${x} y=${y}
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
    const allItems = this.game.items.slice();
    for (let i=0,item; item=allItems[i]; i++) {
      if (item.items) allItems.push(...item.items);
    }
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
        ${allItems.map(item =>
          item.stack === this.game.holdingStack
            ? html`<${Item} key=${item.id} style=${{pointerEvents: 'none', touchAction: 'none'}} x=${item.x + dx/scale} y=${item.y + dy/scale} image=${item.image} item=${item} />`
            : html`<${Item} key=${item.id} x=${item.x} y=${item.y} image=${item.image} item=${item} />`
        )}
      </svg>
    </div>`;
  }
}
const root = document.createElement('div');
document.body.appendChild(root);
root.style = "height: 100%; width: 100%;"
render(html`<${TableGames} />`, root);