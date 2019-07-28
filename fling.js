let healdCard;
class Card {
  constructor(index) {
    this.suit = Card.suits[Math.floor(index / 13)];
    this.value = index % 13 + 1;
    this.id = `${this.value} ${this.suit}`;
    this.width = Card.width;
    this.height = Card.height;
    this.dx = this.dy = 0;
  }
  post() {
    const { id, x, y, image, width, height } = this;
    postMessage({ itemId: id, item: { id, x, y, image, width, height } });
  }
  remove() {
    postMessage({ itemId: this.id });
  }
  get image() {
    return `${Card.image}#${this.value}_${this.suit}`;
  }
  pick(data) {
    this.pickPos = {
      x: data.event.x - this.x,
      y: data.event.y - this.y
    };
    this.lastData = data;
    healdCard = this;
    postMessage({ hold: [this.id] });
  }
  canPlace(data) {
    this.dx = data.event.x - this.lastData.event.x;
    this.dy = data.event.y - this.lastData.event.y;
    this.lastData = data;
  }
  place(data) {
    this.x = data.event.x - this.pickPos.x;
    this.y = data.event.y - this.pickPos.y;
    healdCard = null;
    this.post();
  }
  update() {
    if (healdCard === this || Math.abs(this.dx) < 0.01 || Math.abs(this.dy) < 0.01) return;

    this.x = this.x + this.dx;
    this.y = this.y + this.dy;
    if (this.x < 0) this.dx = Math.abs(this.dx);
    if (this.x > background.width - this.width) this.dx = -Math.abs(this.dx);
    if (this.y < 0) this.dy = Math.abs(this.dy);
    if (this.y > background.height - this.height) this.dy = -Math.abs(this.dy);
    this.dx *= Math.abs(this.dx) > 0.1 ? 0.9 : 0.6;
    this.dy *= Math.abs(this.dy) > 0.1 ? 0.9 : 0.6;

    this.post();
  }
}
Card.width = 72;
Card.height = 110;
Card.suits = 'Heart Diamond Spade Club'.split(' ');
Card.image = '/Contemporary_playing_cards.svg';

const items = {};
const background = {
  id: 'background',
  x: 0, y: 0, width: 300, height: 200
};
items[background.id] = background;

function start(opts) {
  postMessage({ game: { width: opts.width, height: opts.height, actions: [] } });

  background.width = opts.width;
  background.height = opts.height;
  postMessage({ itemId: background.id, item: background });

  new Array(52).fill().forEach((_, index) => {
    const card = new Card(index);
    card.x = background.width / 2 - card.width / 2;
    card.y = background.height / 2 - card.height / 2;
    items[card.id] = card;
    card.post();
  });

  requestAnimationFrame(physics);
}

let physicsRAF;
function physics() {
  physicsRAF = requestAnimationFrame(physics);
  Object.values(items).forEach(card => {
    card.update && card.update();
  });
}

// eslint-disable-next-line no-undef
onmessage = function({ data }){
  const item = items[data.itemId];
  if (data.type === 'start') start(data);
  else if (data.type === 'end') this.cancelAnimationFrame(physicsRAF);
  else if (data.type === 'pick' && item && typeof item.pick === 'function') item.pick(data);
  else if (data.type === 'place') healdCard.place(data);
  else if (data.type === 'canPlace') healdCard.canPlace(data);
};
