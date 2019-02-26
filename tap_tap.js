const cardWidth = 72;
const cardHeight = 110;
const suits = 'Heart Diamond Spade Club'.split(' ');
const cards = {};
new Array(52).fill().forEach((_, index) => {
  cards[index] = {
    id: String(index),
    suit: suits[Math.floor(index / 13)],
    value: index % 13 + 1,
    width: cardWidth, height: cardHeight
  };
  cards[index].image = `/Contemporary_playing_cards.svg#${cards[index].value}_${cards[index].suit}`;
});

let width, height;
function start(opts) {
  resize(opts);
  boom();
}
function resize({ width: w, height: h }) {
  width = w;
  height = h;
  postMessage({
    game: {
      width, height,
      actions: [ 'options' ]
    }
  });
  Object.entries(cards).forEach(([ itemId, card ]) => {
    if (card.x + card.width > width || card.y + card.height > height) {
      pick({ itemId });
    }
  });
}
async function boom() {
  const keys = Object.keys(cards);
  for (let itemId of keys) {
    const card = cards[itemId];
    card.x = width/2 - card.width/2;
    card.y = height/2 - card.height/2;
    postMessage({ itemId, item: card });
  }
  keys.reverse();
  await new Promise(resolve => setTimeout(resolve, 500));
  for (let itemId of keys) {
    await new Promise(resolve => setTimeout(resolve, 25));
    pick({ itemId });
  }
}
function pick({ itemId, _event }) {
  const card = cards[itemId];
  card.x = Math.random() * (width - cardWidth);
  card.y = Math.random() * (height - cardHeight);
  postMessage({ itemId: card.id, item: card });
}

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
const optionsInterface = {
  background: {
    id: 'options_background', x: 0, y: 0, width, height, image: interfaceURL+'#background',
    pick(){
      state.fn = game;
      Object.keys(optionsInterface.items).forEach(itemId => postMessage({ itemId }));
    }
  },
  window: {
    id: 'options_window', x: 0, y: 0, width: 300, height: 100, image: interfaceURL+'#window'
  },
  selected: {
    id: 'options_selected', x: 0, y: 0, width: 100, height: 50, image: interfaceURL+'#selected'
  },
  moveButton: {
    id: 'options_move', x: 0, y: 0, width: 100, height: 50, image: interfaceURL+'#move_button',
    pick(){ state.type = 'move'; optionsInterface.resize(); }
  },
  fleeButton: {
    id: 'options_flee', x: 0, y: 0, width: 100, height: 50, image: interfaceURL+'#flee_button',
    pick(){ state.type = 'flee'; optionsInterface.resize(); }
  },
  init() {
    this.items = {};
    [ this.background, this.window, this.selected, this.moveButton, this.fleeButton
    ].forEach(item => this.items[item.id] = item);
    state.fn = options;
    this.resize();
  },
  resize() {
    this.background.width = width;
    this.background.height = height;

    this.window.x = width/2 - this.window.width/2;
    this.window.y = height/2 - this.window.height/2;

    this.moveButton.y = this.fleeButton.y = this.selected.y = this.window.y + 25;
    this.moveButton.x = this.window.x + 33;
    this.fleeButton.x = this.moveButton.x + this.moveButton.width + 33;
    this.selected.x = state.type === 'move'
      ? this.moveButton.x : this.fleeButton.x;

    Object.entries(this.items).forEach(([ itemId, { id, x, y, width, height, image } ]) => postMessage({ itemId, item: { id, x, y, width, height, image } }));
  }
};

function game(data) {
  if (data.type === 'start') start(data);
  // else if (data.type === 'end') // end(); {}
  else if (data.type === 'action' && data.action === 'options') optionsInterface.init();
  else if (data.type === 'pick') pick(data);
  else if (data.type === 'canPick' && state.type === 'flee') pick(data);
  // else if (data.type === 'place') place(data);
}
function options(data) {
  if (data.type === 'pick') {
    const item = optionsInterface.items[data.itemId];
    if (item && item.pick) item.pick();
  }
}

const state = {
  fn: game,
  type: 'move'
};

// eslint-disable-next-line no-undef
onmessage = function({ data }){
  if (data.type === 'resize') resize(data);
  else state.fn(data);
};
