import { html, render, Component } from 'https://unpkg.com/htm/preact/standalone.mjs';

import Solitare from './solitare.js';

class Item extends Component {
  constructor(props){
    super(props);
    this.state = { x: props.x, y: props.y };
  }
  shouldComponentUpdate(nextProps, nextState){
    const { x, y, image } = this.props;
    const didChange =
      x !== nextProps.x || y !== nextProps.y || image !== nextProps.image ||
      this.state.x !== nextState.x || this.state.y !== nextState.y;
    return didChange;
  }
  componentWillUpdate(props, state){
    if (props.x === this.props.x && props.y === this.props.y) return;
    setTimeout(() => {
      this.setState({ x: props.x, y: props.y });
    }, 1000/60);
  }
  render({ heald, item, image, x: _x, y: _y, ...props }, { x, y }){
    return html`<use ...${props}
      xlinkHref=${image}
      x=${x} y=${y}
      width=${item.width} height=${item.height}
      class=${`Card ${heald ? '' : 'animated'}`}
    />`;
  }
}

class TableGames extends Component {
  static get initialState() {
    return {
      items: [],
      game: { width: 800, height: 600 },
      holding: { dx: 0, dy: 0 }
    };
  }
  constructor(props) {
    super(props);

    this.state = TableGames.initialState;
    this.healdItems = [];
    this.dragStart = { x: 0, y: 0 };

    this.startSolitare();

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.startSolitare = this.startSolitare.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }
  componentDidMount(){
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }
  handleResize(){
    this.svgTransformationMatrix = this.svgEl.getScreenCTM().inverse();
  }

  async startSolitare(){
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = null;
    this.setState(TableGames.initialState, () => {
      this.game = new Solitare();
      this.unsubscribe = this.game.subscribe((itemId, item) => {
        if (itemId !== null) {
          this.setState(({ items }) => {
            const index = items.findIndex(({ id }) => id === itemId);
            if (index === -1) return { items: [ ...items, item ] };
            if (!item) return { items: [
              ...items.slice(0, index),
              ...items.slice(index + 1)
            ] };
            return { items: [
              ...items.slice(0, index),
              ...items.slice(index + 1),
              item
            ] };
          });
        } else {
          this.setState({ game: item });
          setTimeout(this.handleResize, 10);
        }
      });
    });
  }

  itemAt(x, y){
    const domPoint = this.svgEl.createSVGPoint();
    domPoint.x = x;
    domPoint.y = y;
    const svgPoint = domPoint.matrixTransform(this.svgTransformationMatrix);

    const allItems = this.state.items.slice();
    for (let i=0,item; item=allItems[i]; i++) {
      if (item.items) allItems.push(...item.items);
    }

    return allItems.reverse().find(item => {
      if (this.healdItems.includes(item)) return false;
      const { id, x, y, width, height } = item;
      return svgPoint.x >= x && svgPoint.x <= (x + width) &&
             svgPoint.y >= y && svgPoint.y <= (y + height);
    });
  }

  handleMouseDown(event){
    event.preventDefault();
    const item = this.itemAt(event.pageX, event.pageY);
    if (!item) return;
    const { altKey, ctrlKey, metaKey, shiftKey } = event;
    this.healdItems = item.pick({ altKey, ctrlKey, metaKey, shiftKey }) || [];

    this.dragStart = { x: event.pageX, y: event.pageY };
    this.setState({ holding: { dx: 0, dy: 0 } });
  }
  handleMouseMove(event){
    if (!this.healdItems.length) return;
    const { pageX: x, pageY: y } = event;
    this.setState({ holding: {
      dx: x - this.dragStart.x,
      dy: y - this.dragStart.y
    } });
  }
  handleMouseUp(event){
    const item = this.itemAt(event.pageX, event.pageY);
    if (item) {
      const { altKey, ctrlKey, metaKey, shiftKey } = event;
      item.place({ altKey, ctrlKey, metaKey, shiftKey }, this.healdItems);
    }

    this.healdItems = [];
    this.forceUpdate();
  }

  handleTouchStart(event){
    this.handleMouseDown({
      preventDefault(){ event.preventDefault(); },
      pageX: event.touches[0].pageX,
      pageY: event.touches[0].pageY,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    });
  }
  handleTouchMove(event){
    this.handleMouseMove({
      preventDefault(){ event.preventDefault(); },
      pageX: event.touches[0].pageX,
      pageY: event.touches[0].pageY,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    });
  }
  handleTouchEnd(event){
    this.handleMouseUp({
      preventDefault(){ event.preventDefault(); },
      pageX: event.changedTouches[0].pageX,
      pageY: event.changedTouches[0].pageY,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    });
  }

  render({}, { game: { width, height}, items, holding: { dx, dy } }) {
    const scale = this.svgEl && 1 / this.svgTransformationMatrix.a;
    return html `<div style=${{height: '100%', width: '100%'}}>
      <div style=${{position: 'absolute', bottom: 0}}>
        <button onClick=${this.startSolitare}>Solitare</button>
      </div>
      <svg
        style=${{height: '100%', width: '100%', fontSize: 12}}
        viewBox=${`0 0 ${width} ${height}`}
        ref=${el => this.svgEl = el}
        onMouseDown=${this.handleMouseDown}
        onMouseMove=${this.handleMouseMove}
        onMouseUp=${this.handleMouseUp}
        onTouchStart=${this.handleTouchStart}
        onTouchMove=${this.handleTouchMove}
        onTouchEnd=${this.handleTouchEnd}
      >
        ${items.map(item =>
          this.healdItems.includes(item)
            ? html`<${Item} key=${item.id} x=${item.x + dx/scale} y=${item.y + dy/scale} image=${item.image} heald item=${item} />`
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