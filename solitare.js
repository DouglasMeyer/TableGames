const suits = 'Heart Diamond Spade Club'.split(' ');
const cards = new Array(52).fill().map((_, index) => ({
  id: index,
  suit: suits[Math.floor(index / 13)],
  value: index % 13 + 1
}));

class Card {
  static get url() { return `/Contemporary_playing_cards.svg`; }
  static get width() { return 72; }
  get width(){ return Card.width; }
  static get height() { return 110; }
  get height(){ return Card.height; }
  static get padding() { return 10; }
  static get peek() { return 25; }
  static pos(x, y) {
    return [
      Card.padding + x * (Card.width + Card.padding),
      Card.padding + y * (Card.height + Card.padding)
    ];
  }
  constructor(game, id, suit, value) {
    Object.assign(this, {
      game, id, suit, value, revealed: false
    });
  }
  get image() {
    if (this.revealed) return `${Card.url}#${this.value}_${this.suit}`;
    return `${Card.url}#Back`;
  }
  get x() { return this.stack.cardPos(this).x; }
  get y() { return this.stack.cardPos(this).y; }
  trigger() { this.game.trigger(this.id, this); }
  get stack() { return this.game.items.find(stack => stack.items.includes(this)); }
  pick({ altKey, ctrlKey, metaKey, shiftKey, timeStamp }){
    const magicClick = this.revealed && (
      shiftKey || ( timeStamp - this.lastPick <= 500)
    );
    if (magicClick) {
      const items = this.stack.items;
      const goalStack = this.game.goalStacks.find(stack => stack.canPlace(this));
      const cardLastOnStack = this === items.slice(-1)[0];
      if (goalStack && cardLastOnStack) {
        goalStack.items.push(items.splice(-1)[0]);
        const newEndOfStack = items.slice(-1)[0]
        if (newEndOfStack) {
          newEndOfStack.revealed = true;
          newEndOfStack.trigger();
        }
        this.trigger();
        this.game.checkWin();
        return;
      }
    }
    this.lastPick = timeStamp;
    return this.stack.pick(this);
  }
  place(_keys, cards){ this.stack.place(this, cards); }
}
class Stack {
  get width(){ return Card.width; }
  get height(){ return Card.height; }
  constructor(game, x, y) {
    Object.assign(this, {
      game, x, y, items: []
    });
  }
  get image() { return `${Card.url}#stack`; }
  cardPos(card) {
    const index = this.items.indexOf(card);
    return { x: this.x, y: this.y + Math.min(index, 3) };
  }
  trigger() { this.game.trigger(this.id, this); }
}
class DrawStack extends Stack {
  pick(_card){
    const { discardStack } = this.game;
    if (this.items.length) {
      const card = this.items.pop();
      card.revealed = true;
      discardStack.items.push(card);
      card.trigger();
    } else {
      while (discardStack.items.length) {
        const card = discardStack.items.pop();
        card.revealed = false;
        this.items.push(card);
        card.trigger();
      }
    }
  }
  place(_card, _cards){}
}
class DiscardStack extends Stack {
  pick(_card){
    const cards = this.items.slice(-1);
    if (!cards[0]) return;
    cards[0].trigger();
    return cards;
  }
  place(_card, _cards){}
}
class GoalStack extends Stack {
  pick(_card){
    const cards = this.items.slice(-1);
    cards[0].trigger();
    return cards;
  }
  canPlace(card){
    const lastOnStack = this.items.slice(-1)[0];
    return lastOnStack
      ? card.suit === lastOnStack.suit &&
        card.value === lastOnStack.value + 1
      : card.value === 1;
  }
  place(_card, cards){
    const card = cards[0];
    if (!this.canPlace(card)) return;
    const items = card.stack.items;
    items.splice(items.indexOf(card), 1);
    this.items.push(card);
    card.trigger();
    const newEndOfStack = items.slice(-1)[0]
    if (newEndOfStack) {
      newEndOfStack.revealed = true;
      newEndOfStack.trigger();
    }
    this.game.checkWin();
  }
}
class CascadingStack extends Stack {
  pick(card) {
    const index = this.items.indexOf(card);
    if (index === -1) return;
    if (card.revealed) {
      const cards = this.items.slice(index)
      cards.forEach(card => card.trigger());
      return cards;
    }
  }
  place(_card, cards) {
    const lastOnStack = this.items.slice(-1)[0];
    const firstHealdCard = cards[0];
    if (!firstHealdCard) return;
    const canPlace = cards.length &&
      lastOnStack
      ? lastOnStack.value - 1 === firstHealdCard.value &&
        Math.floor(suits.indexOf(lastOnStack.suit)/2) !== Math.floor(suits.indexOf(firstHealdCard.suit)/2)
      : firstHealdCard.value === 13;
    if (!canPlace) return;
    const sourceItems = cards[0].stack.items;
    const newEndOfStack = sourceItems[sourceItems.indexOf(cards[0]) - 1];
    if (newEndOfStack) {
      newEndOfStack.revealed = true;
      newEndOfStack.trigger();
    }
    cards.forEach(card => {
      const items = card.stack.items;
      items.splice(items.indexOf(card), 1);
      this.items.push(card);
      card.trigger();
    });
  }
  cardPos(card) {
    const index = this.items.indexOf(card);
    const offset = this.items.slice(0, index).reduce((acc, { revealed }) => acc + (revealed ? Card.peek : Card.padding), 0);
    return { x: this.x, y: this.y + offset };
  }
}

const sleep = seconds => new Promise(resolve => setTimeout(resolve, 1000*seconds));
const solitare = {
  async deal() {
    for (let i=0; i<7; i++) {
      let card;
      for (let j=i; j<7; j++) {
        await sleep(0.05);
        card = this.drawStack.items.pop();
        this.cascadingStacks[j].items.push(card);
        card.trigger();
      }
      await sleep(0.05);
      card = this.cascadingStacks[i].items.slice(-1)[0];
      card.revealed = true;
      card.trigger();
    }
  },
  async checkWin() {
    if (!this.goalStacks.every(stack => stack.items.length === 13)) return;
    for (let index=0,stack; stack=this.goalStacks[index]; index++){
      let x = (this.width - Card.width) * Math.random();
      let y = (this.height - Card.height) * Math.random();
      stack.items.forEach(({ id, image, width, height }) => {
        this.trigger(id, { id, image, width, height, x, y });
      });
      await sleep(0.3);
      stack.items.forEach(({ id, image, width, height }, index, items) => {
        this.trigger(id, {
          id, image, width, height,
          x: x + Card.height * 4 * Math.cos(index / items.length * Math.PI*2),
          y: y + Card.height * 4 * Math.sin(index / items.length * Math.PI*2)
        });
      });
      await sleep(0.5);
    }
  },
  trigger(itemId, { x, y, width, height, image }){
    postMessage({ itemId, item: { id: itemId, x, y, width, height, image } });
  }
};
(function(){
  solitare.actions = {
    Deal: async function(){
      this.items.forEach(stack =>
        this.drawStack.items.push(...stack.items.splice(0))
      );
      this.drawStack.items.sort(() => Math.random() - 0.5);
      this.drawStack.items.forEach(card => {
        card.revealed = false;
        card.trigger();
      });
      await sleep(0.3);
      this.deal();
    }.bind(solitare)
  };
  [ solitare.width, solitare.height ] = Card.pos(7, 4);
  solitare.drawStack = new DrawStack(solitare, ...Card.pos(0, 0));
  solitare.discardStack = new DiscardStack(solitare, ...Card.pos(1, 0));
  solitare.goalStacks = new Array(4).fill().map((_, i) => new GoalStack(solitare, ...Card.pos(3+i, 0)));
  solitare.cascadingStacks = new Array(7).fill().map((_, i) => new CascadingStack(solitare, ...Card.pos(i, 1)));
  solitare.items = [
    ...solitare.cascadingStacks,
    solitare.drawStack,
    solitare.discardStack,
    ...solitare.goalStacks
  ];
  solitare.items.forEach((stack, index) => { stack.id = `stack_${index}`; });
  cards.slice().sort(() => Math.random() - 0.5).forEach(({ id, suit, value }) => {
    solitare.drawStack.items.push(new Card(solitare, id, suit, value));
  });
  solitare.deal();
})();

function start({ _width, _height }){
  postMessage({
    game: {
      width: solitare.width, height: solitare.height,
      actions: Object.keys(solitare.actions)
    }
  });
  solitare.items.forEach(stack => {
    stack.trigger();
  });
  solitare.items.forEach(stack => {
    stack.items.forEach(item => {
      item.trigger();
    });
  });
}
function pick({ itemId, event }){
  const items = {};
  solitare.items.forEach(stack => {
    items[stack.id] = stack;
    stack.items.forEach(i =>
      items[i.id] = i
    );
  });
  const item = items[itemId];
  if (item) {
    const hold = (item.pick(event) || []).map(({ id }) => id);
    postMessage({ hold });
  }
}
function place({ itemId, itemIds, event }){
  const items = {};
  solitare.items.forEach(stack => {
    items[stack.id] = stack;
    stack.items.forEach(i =>
      items[i.id] = i
    );
  });
  const cards = itemIds.map(id => items[id]);
  items[itemId].place(event, cards);
}

// eslint-disable-next-line no-undef
onmessage = function({ data }){
  if (data.type === 'start') start(data);
  else if (data.type === 'action' && solitare.actions[data.action]) solitare.actions[data.action]();
  else if (data.type === 'pick') pick(data);
  else if (data.type === 'place') place(data);
};
