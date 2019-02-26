import { html, render, Component } from 'https://unpkg.com/htm/preact/standalone.mjs';

/* API

{ type: 'start', width:Number, height:Number } =>
{ type: 'resize', width:Number, height:Number } =>
{ type: 'end' } =>
{ type: 'action', action:String } =>
{ type: 'pick', itemId:Number, event: { timeStamp:Number, altKey, ctrlKey, metaKey, shiftKey } } =>
{ type: 'place', itemId:Number, itemIds:[Number], event: { timeStamp:Number, altKey, ctrlKey, metaKey, shiftKey } } =>
=> { hold:[Number] }
=> { itemId:Number, item: { id, x, y, image, width, height } } // add/update
=> { itemId:Number, item: null } // remove
=> { game: { width, height, actions:[String] } }

*/

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
  componentWillUpdate(props, _state){
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

class PlayGame extends Component {
  static get initialState() {
    return {
      items: [],
      game: { width: 800, height: 600, actions: [] },
      holding: { dx: 0, dy: 0 }
    };
  }
  constructor(props) {
    super(props);

    this.state = PlayGame.initialState;
    this.healdItems = [];
    this.dragStart = { x: 0, y: 0 };

    this.startGame();

    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);
    this.handleResize = this.handleResize.bind(this);
  }
  componentDidMount(){
    window.addEventListener('resize', this.handleResize);
  }
  componentWillUnmount(){
    if (this.unsubscribe) this.unsubscribe();
  }
  handleResize(){
    delete this._svgTransformationMatrix;
    this.props.gameWorker.postMessage({ type: 'resize', width: document.body.clientWidth, height: document.body.clientHeight });
  }
  get svgTransformationMatrix(){
    if (this._svgTransformationMatrix) return this._svgTransformationMatrix;
    this._svgTransformationMatrix = this.svgEl.getScreenCTM().inverse();
    return this._svgTransformationMatrix;
  }

  async startGame(){
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = null;
    delete this._svgTransformationMatrix;
    await new Promise(resolve => this.setState(PlayGame.initialState, resolve));
    const { gameWorker } = this.props;
    gameWorker.postMessage({ type: 'start', width: document.body.clientWidth, height: document.body.clientHeight });
    this.unsubscribe = () => gameWorker.postMessage({ type: 'end' });
    gameWorker.onmessage = event => {
      const { game, itemId, item, hold } = event.data;
      if (hold) {
        this.healdItems = hold.map(id => this.state.items.find(item => item.id === id));
        this.setState({ holding: { dx: 0, dy: 0 } });
        return;
      }
      if (game) {
        this.setState({ game }, () => {
          delete this._svgTransformationMatrix;
        });
        return;
      }
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
    };
  }

  itemAt(x, y){
    const domPoint = this.svgEl.createSVGPoint();
    domPoint.x = x;
    domPoint.y = y;
    const svgPoint = domPoint.matrixTransform(this.svgTransformationMatrix);

    return this.state.items.slice().reverse().find(item => {
      if (this.healdItems.includes(item)) return false;
      const { x, y, width, height } = item;
      return svgPoint.x >= x && svgPoint.x <= (x + width) &&
             svgPoint.y >= y && svgPoint.y <= (y + height);
    });
  }
  itemUnderItem(centerItem){
    const { dx, dy } = this.state.holding;
    const scale = this.svgEl && 1 / this.svgTransformationMatrix.a;
    const healdCenter = {
      x: centerItem.x + dx/scale + centerItem.width/2,
      y: centerItem.y + dy/scale + centerItem.height/2
    };
    const itemDistances = new Map();
    this.state.items.forEach(item => {
      if (
        this.healdItems.includes(item) ||
        item.x + item.width < centerItem.x + dx/scale ||
        item.y + item.height < centerItem.y + dy/scale ||
        item.x > centerItem.x + dx/scale + centerItem.width ||
        item.y > centerItem.y + dy/scale + centerItem.height
      ) return;
      itemDistances.set(item, Math.pow(
        Math.pow(item.x + item.width/2 - healdCenter.x, 2) +
        Math.pow(item.y + item.height/2 - healdCenter.y, 2)
      , 0.5));
    });
    const minDistance = Math.min(...itemDistances.values());
    const closestEntity = [...itemDistances.entries()].find(([ _item, distance ]) => distance === minDistance);
    if (closestEntity) return closestEntity[0];
  }

  handleMouseDown(event){
    event.preventDefault();
    const item = this.itemAt(event.pageX, event.pageY);
    if (!item) return;
    const { altKey, ctrlKey, metaKey, shiftKey, timeStamp } = event;
    this.props.gameWorker.postMessage({
      type: 'pick',
      itemId: item.id,
      event: { altKey, ctrlKey, metaKey, shiftKey, timeStamp }
    });

    this.dragStart = { x: event.pageX, y: event.pageY };
  }
  handleMouseMove(event){
    const { pageX: x, pageY: y } = event;
    if (this.healdItems.length) {
      this.setState({ holding: {
        dx: x - this.dragStart.x,
        dy: y - this.dragStart.y
      } });
      const itemUnderItem = this.itemUnderItem(this.healdItems[0]);
      if (itemUnderItem) {
        const { altKey, ctrlKey, metaKey, shiftKey, timeStamp } = event;
        this.props.gameWorker.postMessage({
          type: 'canPlace',
          itemId: itemUnderItem.id,
          itemIds: this.healdItems.map(item => item.id),
          event: { altKey, ctrlKey, metaKey, shiftKey, timeStamp }
        });
      }
    } else {
      const item = this.itemAt(event.pageX, event.pageY);
      if (item) {
        const { altKey, ctrlKey, metaKey, shiftKey, timeStamp } = event;
        this.props.gameWorker.postMessage({
          type: 'canPick',
          itemId: item.id,
          event: { altKey, ctrlKey, metaKey, shiftKey, timeStamp }
        });
      }
    }
  }
  handleMouseUp(event){
    if (this.healdItems[0]) {
      const itemUnderItem = this.itemUnderItem(this.healdItems[0]);
      if (itemUnderItem) {
        const { altKey, ctrlKey, metaKey, shiftKey, timeStamp } = event;
        this.props.gameWorker.postMessage({
          type: 'place',
          itemId: itemUnderItem.id,
          itemIds: this.healdItems.map(item => item.id),
          event: { altKey, ctrlKey, metaKey, shiftKey, timeStamp }
        });
      }
    }

    this.healdItems = [];
    this.forceUpdate();
  }

  handleTouchStart(event){
    const { pageX, pageY } = event.touches[0];
    Object.assign(event, { pageX, pageY });
    this.handleMouseDown(event);
  }
  handleTouchMove(event){
    const { pageX, pageY } = event.touches[0];
    Object.assign(event, { pageX, pageY });
    this.handleMouseMove(event);
  }
  handleTouchEnd(event){
    const { pageX, pageY } = event.changedTouches[0];
    Object.assign(event, { pageX, pageY });
    this.handleMouseUp(event);
  }

  render({ gameWorker, onReset }, { game: { width, height, actions }, items, holding: { dx, dy } }) {
    const scale = this.svgEl && 1 / this.svgTransformationMatrix.a;
    return html`<div style=${{height: '100%', width: '100%'}}>
      <div style=${{position: 'absolute', bottom: 0}}>
        <button onClick=${onReset}>exit</button>
        ${actions.map(label => {
          return html`<button onClick=${() => gameWorker.postMessage({ type: 'action', action: label })}>${label}</button>`;
        })}
      </div>
      <svg
        style=${{height: '100%', width: '100%', fontSize: 12}}
        viewBox=${`0 0 ${width} ${height}`}
        ref=${el => { if (el) this.svgEl = el; }}
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

const games =
  [ { name: 'Solitare'
    , url: '/solitare.js'
    }
  , { name: 'Tap Tap'
    , url: '/tap_tap.js'
    }
];

class TableGames extends Component {
  constructor(props){
    super(props);
    this.state = {};
    this.handleLoadGame = this.handleLoadGame.bind(this);
  }
  handleLoadGame(url){
    const gameWorker = new Worker(url);
    this.setState({ gameWorker });
  }
  render(_props, { gameWorker }) {
    if (gameWorker) return html`<${PlayGame} gameWorker=${gameWorker} onReset=${() => this.setState({ gameWorker: null })} />`;
    return html`<div class="GamePicker">
      ${games.map(({ name, url }) => html`<div onClick=${() => this.handleLoadGame(url)}>
        ${name}
      </div>`)}
      <div>
        <input ref=${el => this.inputEl = el} />
        <button onClick=${() => this.handleLoadGame(this.inputEl.value)}>Play</button>
      </div>
    </div>`;
  }
}

const root = document.createElement('div');
document.body.appendChild(root);
root.style = "height: 100%; width: 100%;";
render(html`<${TableGames} />`, root);