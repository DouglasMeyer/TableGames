const game = {
  width: null,
  height: null,
  fleeing: false,
  showOptions: false,
  items: {}
};

class Item {
  constructor(id) {
    this.id = id;
    game.items[id] = this;
  }
  post() {
    const { id, x, y, image, width, height } = this;
    postMessage({ itemId: id, item: { id, x, y, image, width, height } });
  }
  remove() {
    postMessage({ itemId: this.id });
  }
}
class InterfaceItem extends Item {
  constructor(props) {
    super(props.id);
    this.x = this.y = this.width = this.height = 0;
    Object.defineProperties(this, Object.getOwnPropertyDescriptors(props));
  }
  post() {
    if (game.showOptions) super.post();
  }
}
const cardWidth = 72;
const cardHeight = 110;
const suits = 'Heart Diamond Spade Club'.split(' ');
class Card extends Item {
  constructor(index) {
    super(`card ${index}`);
    this.suit = suits[Math.floor(index / 13)];
    this.value = index % 13 + 1;
    this.width = cardWidth;
    this.height = cardHeight;
  }
  get image() {
    return `./Contemporary_playing_cards.svg#${this.value}_${this.suit}`;
  }
  canPick() {
    if (game.fleeing) this.pick();
  }
  pick() {
    this.x = Math.random() * (game.width - cardWidth);
    this.y = Math.random() * (game.height - cardHeight);
    this.post();
  }
}

new Array(52).fill().forEach((_, index) => {
  new Card(index);
});

const interfaceURL = URL.createObjectURL(new Blob([`
<svg xmlns='http://www.w3.org/2000/svg'>
  <rect id="background" width="100%" height="100%" fill="black" fill-opacity="0.7" />
  <rect id="window" width="300" height="100" fill="white" fill-opacity="0.9" />
  <rect id="selected" width="100" height="50" rx="10" fill="lightGray" />
  <g id="move_button">
    <rect width="100" height="50" rx="10" stroke="gray" stroke-width="2" fill="none" />
    <text x="50" y="30" text-anchor="middle" font-size="20px">Move</text>
  </g>
  <g id="flee_button">
    <rect width="100" height="50" rx="10" stroke="gray" stroke-width="2" fill="none" />
    <text x="50" y="30" text-anchor="middle" font-size="20px">Flee</text>
  </g>
</svg>`], { type: 'image/svg+xml' }));
const interfaceItems = [
  new InterfaceItem({
    id: 'options_background', image: interfaceURL+'#background',
    get width(){ return game.width; },
    get height(){ return game.height; },
    pick() {
      game.showOptions = false;
      interfaceItems.forEach(item => item.remove());
    }
  }),
  new InterfaceItem({
    id: 'options_window', width: 300, height: 100, image: interfaceURL+'#window',
    get x(){ return game.width/2 - this.width/2; },
    get y(){ return game.height/2 - this.height/2; }
  }),
  new InterfaceItem({
    id: 'options_selected', width: 100, height: 50, image: interfaceURL+'#selected',
    get x(){ return game.items[game.fleeing ? 'options_flee' : 'options_move'].x; },
    get y(){ return game.items['options_window'].y + 25; },
  }),
  new InterfaceItem({
    id: 'options_move', width: 100, height: 50, image: interfaceURL+'#move_button',
    get x(){ return game.items['options_window'].x + 33; },
    get y(){ return game.items['options_window'].y + 25; },
    pick(){
      game.fleeing = false;
      interfaceItems.forEach(item => item.post());
    }
  }),
  new InterfaceItem({
    id: 'options_flee', width: 100, height: 50, image: interfaceURL+'#flee_button',
    get x(){
      const moveButton = game.items['options_move'];
      return moveButton.x + moveButton.width + 33;
    },
    get y(){ return game.items['options_window'].y + 25; },
    pick(){
      game.fleeing = true;
      interfaceItems.forEach(item => item.post());
    }
  })
];

async function start(opts) {
  resize(opts);
  const cards = Object.values(game.items).filter(item => item instanceof Card);
  for (let card of cards) {
    card.x = game.width/2 - card.width/2;
    card.y = game.height/2 - card.height/2;
    card.post();
  }
  cards.reverse();
  await new Promise(resolve => setTimeout(resolve, 500));
  for (let card of cards) {
    await new Promise(resolve => setTimeout(resolve, 25));
    card.pick();
  }
}
function resize({ width: w, height: h }) {
  game.width = w;
  game.height = h;
  postMessage({
    game: {
      width: game.width, height: game.height,
      actions: [ 'options' ]
    }
  });
  Object.values(game.items).forEach(item => {
    if (item.suit && (item.x + item.width > game.width || item.y + item.height > game.height)) {
      item.pick();
    }
  });
  interfaceItems.forEach(item => item.post());
}

// eslint-disable-next-line no-undef
onmessage = function({ data }){
  if (data.type === 'start') start(data);
  if (data.type === 'resize') resize(data);
  if (data.type === 'action' && data.action === 'options') {
    game.showOptions = true;
    interfaceItems.forEach(item => item.post());
  }

  const item = game.items[data.itemId];
  if (data.type === 'pick' && item && typeof item.pick === 'function') item.pick();
  if (data.type === 'canPick' && item && typeof item.canPick === 'function') item.canPick();
  if (data.type === 'place' && item && typeof item.place === 'function') item.place();
  if (data.type === 'canPlace' && item && typeof item.canPlace === 'function') item.canPlace();
};
