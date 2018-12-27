import { html, render, Component } from 'https://unpkg.com/htm/preact/standalone.mjs';

const width = 72;
const height = 110;
class Card extends Component {
  constructor(props) {
    super(props);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleReveal = this.handleReveal.bind(this);
  }

  handleMouseDown(e){
    this.props.onMouseDown(this.props.index, e);
  }
  handleReveal(e){
    e.preventDefault();
    this.props.onReveal(this.props.index);
  }

  render({ revealed, value, suite, x, y, animated }) {
    return html`<use
      xlink:href=${`./Contemporary_playing_cards.svg#${revealed ? `${value}_${suite}` : 'Back'}`}
      x=${x} y=${y}
      class=${`interactable Card${animated ? ' animated' : ''}`}
      onMouseDown=${this.handleMouseDown}
      onContextMenu=${this.handleReveal}
    />`;
  }
}

const sleep = seconds => new Promise(function(resolve){ setTimeout(resolve, 1000 * seconds); });

class TableGames extends Component {
  constructor(props) {
    super(props);

    this.state = { cards: [] };

    this.startSolitare();

    this.handleReveal = this.handleReveal.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.startShuffle = this.startShuffle.bind(this);
    this.startSolitare = this.startSolitare.bind(this);
  }

  async startShuffle(){
    let { cards } = this.state;
    this.setState({ stacks: [] });
    for (let i=cards.length-1,card; card=cards[i]; i--){
      card.animated = true;
      card.x = `${Math.random() * 80}%`;
      card.y = `${Math.random() * 80}%`;
      this.setState({ cards });
      await sleep(0.01);
    }
    for (let i=0,card; card=cards[i]; i++){
      card.revealed = false;
      this.setState({ cards });
      await sleep(0.01);
    }
    cards = cards.sort(_ => Math.random() - 0.5);
    for (let i=0,card; card=cards[i]; i++){
      card.x = 10;
      card.y = 10;
      this.setState({ cards });
      await sleep(0.01);
    }
    for (let i=0,card; card=cards[i]; i++){
      card.animated = false;
    }
  }
  async startSolitare(){
    const stacks = [
      { x: 10 + (width+10)*0, y: 10 + (height+10)*0 },
      { x: 10 + (width+10)*1, y: 10 + (height+10)*0 },

      { x: 10 + (width+10)*3, y: 10 + (height+10)*0 },
      { x: 10 + (width+10)*4, y: 10 + (height+10)*0 },
      { x: 10 + (width+10)*5, y: 10 + (height+10)*0 },
      { x: 10 + (width+10)*6, y: 10 + (height+10)*0 },

      { x: 10 + (width+10)*0, y: 10 + (height+10)*1, type: 'cascade' },
      { x: 10 + (width+10)*1, y: 10 + (height+10)*1, type: 'cascade' },
      { x: 10 + (width+10)*2, y: 10 + (height+10)*1, type: 'cascade' },
      { x: 10 + (width+10)*3, y: 10 + (height+10)*1, type: 'cascade' },
      { x: 10 + (width+10)*4, y: 10 + (height+10)*1, type: 'cascade' },
      { x: 10 + (width+10)*5, y: 10 + (height+10)*1, type: 'cascade' },
      { x: 10 + (width+10)*6, y: 10 + (height+10)*1, type: 'cascade' },
    ];
    stacks.forEach(stack => stack.add = function(card){
      if (card.parent) card.parent.child = null;
      let target = this;
      while (target.child) target = target.child;
      card.x = target.x;
      card.y = this.type === 'cascade' && target !== this ? target.y + 20 : target.y;
      target.child = card;
      card.parent = target;
    });
    const suites = 'Heart Diamond Spade Club'.split(' ');
    const cards = new Array(52).fill()
      .map((_, i) => ({
        suite: suites[Math.floor(i / 13)],
        value: i % 13 + 1,
        x: 10, y: 10,
        animated: true,
      }))
      .sort(_ => Math.random() - 0.5);
    cards.forEach(stacks[0].add.bind(stacks[0]));
    this.state = { stacks, cards };

    async function moveCard(index, stack, reveal=false) {
      this.setState(({ cards }) => {
        const card = cards[index];
        stack.add(card);
        card.animated = true;
        return { cards };
      });
      await sleep(0.3);
      this.setState(({ cards }) => {
        const card = cards[index];
        card.revealed = reveal;
        card.animated = false;
        return { cards };
      });
    }
    let cardIndex = 52 - 7 - 6 - 5 - 4 - 3 - 2 - 1;
    for (let y=0; y<7; y++){
      for (let x=y; x<7; x++){
        await sleep(0.025);
        moveCard.call(this, cardIndex++, stacks[x+6], x === y);
      }
    }
  }

  handleReveal(cardIndex){
    const { cards } = this.state;
    cards[cardIndex].revealed = !cards[cardIndex].revealed;
    this.setState({ cards });
  }
  handleMouseDown(cardIndex, event){
    const { x, y } = event;
    const { cards } = this.state;
    let stackLength = 1;
    let card = cards.splice(cardIndex, 1)[0];
    card.animated = false;
    cards.push(card);
    while (card.child) {
      stackLength++;
      card = cards.splice(cards.indexOf(card.child), 1)[0];
      card.animated = false;
      cards.push(card);
    }
    this.grabbedCard = {
      cardIndex: cards.length - stackLength,
      last: { x, y },
      from: { x: card.x, y: card.y }
    };
    this.setState({ cards })
  }
  handleMouseMove(event){
    if (!this.grabbedCard) return;
    const { cardIndex, last } = this.grabbedCard;
    const { cards, stacks } = this.state;
    let card = cards[cardIndex];
    card.x += event.x - last.x;
    card.y += event.y - last.y;
    this.grabbedCard.last = { x: event.x, y: event.y };
    this.grabbedCard.target = [ ...cards, ...stacks ]
      .filter(({ x: tX, y: tY }, index) =>
        (index < cardIndex || index >= 52) &&
        tX < card.x + width && tX > card.x - width &&
        tY < card.y + height && tY > card.y - height
      )
      .sort((a, b) =>
        Math.pow(Math.pow(card.x - a.x, 2) + Math.pow(card.y - a.y, 2), 0.5) -
        Math.pow(Math.pow(card.x - b.x, 2) + Math.pow(card.y - b.y, 2), 0.5)
      )[0];
    while (card.child) {
      card = card.child;
      card.x += event.x - last.x;
      card.y += event.y - last.y;
    }
    this.setState({ cards });
  }
  handleMouseUp(){
    if (!this.grabbedCard) return;
    const { cards } = this.state;
    let card = cards[this.grabbedCard.cardIndex];
    card.animated = true;
    let stack = this.grabbedCard.target;
    if (stack) {
      while (stack.parent) stack = stack.parent;
      stack.add(card);
      while (card.child) {
        card = card.child;
        card.animated = true;
        stack.add(card);
      }
    } else {
      card.x = this.grabbedCard.from.x;
      card.y = this.grabbedCard.from.y;
    }
    this.setState({ cards });
    delete this.grabbedCard;
  }

  render({}, { cards, stacks }) {
    return html `<div style="height: 100%; width: 100%;">
      <div style="position: absolute; bottom: 0;">
        <button onClick=${this.startSolitare}>Solitare</button>
        <button onClick=${this.startShuffle}>Shuffle</button>
      </div>
      <svg
        style="height: 100%; width: 100%; font-size: 12px;"
        onMouseMove=${this.handleMouseMove}
        onMouseUp=${this.handleMouseUp}
      >
        ${stacks.map(({ x, y }) =>
          html`<rect ...${{ width, height, x, y }} rx="6" fill="transparent" stroke="black" stroke-width=".5"/>`
        )}
        ${cards.map((card, cardIndex) =>
          html`<${Card} ...${card} index=${cardIndex} key=${`${card.suite} ${card.value}`}
            onMouseDown=${this.handleMouseDown}
            onReveal=${this.handleReveal}
          />`
        )}
      </svg>
    </div>`;
  }
}
const root = document.createElement('div');
document.body.appendChild(root);
root.style = "height: 100%; width: 100%;"
render(html`<${TableGames} />`, root);