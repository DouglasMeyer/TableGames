export const name = 'Solitare';

const suits = 'Heart Diamond Spade Club'.split(' ');
const cards = new Array(52).fill().map((_, index) => ({
  id: index,
  suit: suits[Math.floor(index / 13)],
  value: index % 13 + 1
}));

/* API
items: []
x, y, width, height, image
canPick, pick
canPlace, place
*/

class Card {
  static get url() { return `./Contemporary_playing_cards.svg`; }
  static get width() { return 72; }
  static get height() { return 110; }
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
  get stack() { return this.game.items.find(stack => stack.items.includes(this)); }
  get x() { return this.stack.cardPos(this).x; }
  get y() { return this.stack.cardPos(this).y; }
  pick({ altKey, ctrlKey, metaKey, shiftKey }){
    if (shiftKey) {
      const goalStack = this.game.goalStacks.find(stack => stack.canPlace(this));
      const cardLastOnStack = this === this.stack.items.slice(-1)[0];
      if (goalStack && cardLastOnStack) goalStack.items.push(this.stack.items.splice(-1)[0]);
      this.game.trigger();
    } else {
      this.stack.pick(this);
    }
  }
  place(){ this.stack.place(this); }
}
class Stack {
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
}
class DrawStack extends Stack {
  constructor(game, x, y) {
    super(game, x, y);
    cards.slice().sort(() => Math.random() - 0.5).forEach(({ id, suit, value }) => {
      this.items.push(new Card(game, id, suit, value))
    })
  }
  pick(_card){
    const { discardStack } = this.game;
    if (this.items.length) {
      const card = this.items.pop();
      card.revealed = true;
      discardStack.items.push(card);
    } else {
      while (discardStack.items.length) {
        const card = discardStack.items.pop();
        card.revealed = false;
        this.items.push(card);
      }
    }
    this.game.trigger();
  }
  place(_card){}
}
class DiscardStack extends Stack {
  pick(_card){
    this.game.holdingStack.grab(this.items.splice(-1), this);
    this.game.trigger();
  }
  place(_card){}
}
class GoalStack extends Stack {
  pick(_card){
    this.game.holdingStack.grab(this.items.splice(-1), this);
    this.game.trigger();
  }
  canPlace(card){
    const lastOnStack = this.items.slice(-1)[0];
    return lastOnStack
      ? card.suit === lastOnStack.suit &&
        card.value === lastOnStack.value + 1
      : card.value === 1;
  }
  place(_card){
    const canPlace = this.game.holdingStack.items.length === 1 && this.canPlace(this.game.holdingStack.items[0]);
    if (!canPlace) return;
    this.items.push(...this.game.holdingStack.items.splice(0));
    this.game.trigger();
  }
}
class CascadingStack extends Stack {
  pick(card) {
    const index = this.items.indexOf(card);
    if (index === -1) return;
    if (card.revealed) {
      this.game.holdingStack.grab(this.items.splice(index), this);
      this.game.trigger();
    } else if (index === this.items.length - 1) {
      this.items.slice(-1)[0].revealed = true;
      this.game.trigger();
    }
  }
  place(_card) {
    const lastOnStack = this.items.slice(-1)[0];
    const firstHealdCard = this.game.holdingStack.items[0];
    if (!firstHealdCard) return;
    const canPlace = this.game.holdingStack.items.length &&
      lastOnStack
      ? lastOnStack.value - 1 === firstHealdCard.value &&
        Math.floor(suits.indexOf(lastOnStack.suit)/2) !== Math.floor(suits.indexOf(firstHealdCard.suit)/2)
      : firstHealdCard.value === 13;
    if (!canPlace) return;
    this.items.push(...this.game.holdingStack.items.splice(0));
    this.game.trigger();
  }
  cardPos(card) {
    const index = this.items.indexOf(card);
    const offset = this.items.slice(0, index).reduce((acc, { revealed }) => acc + (revealed ? Card.peek : Card.padding), 0);
    return { x: this.x, y: this.y + offset };
  }
}
class HoldingStack {
  constructor(game) {
    Object.assign(this, {
      game, x: 0, y: 0, items: []
    });
  }
  cardPos(card) {
    const index = this.items.indexOf(card);
    return { x: this.x, y: this.y + index * Card.peek };
  }
  grab(cards, stack) {
    this.sourceStack = stack;
    this.x = stack.cardPos(cards[0]).x;
    this.y = stack.cardPos(cards[0]).y;
    this.items.push(...cards);
  }
  reset() {
    if (this.sourceStack) {
      this.sourceStack.items.push(...this.items.splice(0));
      this.game.trigger();
    }
    this.sourceStack = null;
  }
}

export default class Solitare {
  constructor() {
    [ this.width, this.height ] = Card.pos(7, 4);
    this.holdingStack = new HoldingStack(this);
    this.drawStack = new DrawStack(this, ...Card.pos(0, 0));
    this.discardStack = new DiscardStack(this, ...Card.pos(1, 0));
    this.goalStacks = new Array(4).fill().map((_, i) => new GoalStack(this, ...Card.pos(3+i, 0)));
    this.cascadingStacks = new Array(7).fill().map((_, i) => new CascadingStack(this, ...Card.pos(i, 1)));
    this.items = [
      ...this.cascadingStacks,
      this.drawStack,
      this.discardStack,
      ...this.goalStacks,
      this.holdingStack
    ];
    this.items.forEach((stack, index) => { stack.id = `stack_${index}`; });
    this.subscriptions = [];
    // deal
    for (let i=0; i<7; i++) {
      for (let j=i; j<7; j++) {
        this.cascadingStacks[j].items.push(this.drawStack.items.pop());
      }
      this.cascadingStacks[i].items.slice(-1)[0].revealed = true;
    }
  }
  subscribe(fn) {
    this.subscriptions.push(fn);
    return function unsubscribe(){
      const index = this.subscriptions.indexOf(fn);
      if (index === -1) return false;
      this.subscriptions.splice(index, 1);
      return true;
    }.bind(this);
  }
  trigger() {
    this.subscriptions.forEach(fn => fn());
  }
}
