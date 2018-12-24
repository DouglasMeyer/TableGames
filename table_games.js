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

      { x: 10 + (width+10)*0, y: 10 + (height+10)*1 },
      { x: 10 + (width+10)*1, y: 10 + (height+10)*1 },
      { x: 10 + (width+10)*2, y: 10 + (height+10)*1 },
      { x: 10 + (width+10)*3, y: 10 + (height+10)*1 },
      { x: 10 + (width+10)*4, y: 10 + (height+10)*1 },
      { x: 10 + (width+10)*5, y: 10 + (height+10)*1 },
      { x: 10 + (width+10)*6, y: 10 + (height+10)*1 },
    ];
    const suites = 'Heart Diamond Spade Club'.split(' ');
    const cards = new Array(52).fill()
      .map((_, i) => ({
        suite: suites[Math.floor(i / 13)],
        value: i % 13 + 1,
        x: 10, y: 10,
      }))
      .sort(_ => Math.random() - 0.5);
    this.state = { stacks, cards };

    async function moveCard(index, y, x, reveal=false) {
      this.setState(({ cards }) => {
        const card = cards[index];
        card.y = y;
        card.x = x;
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
    let cardIndex = 0;
    for (let y=0; y<7; y++){
      for (let x=y; x<7; x++){
        await sleep(0.025);
        moveCard.call(this, cardIndex++, 10+height+10+20*y, 10+(width+10)*x, x === y);
      }
    }
  }

  handleReveal(cardIndex){
    const { cards } = this.state;
    cards[cardIndex].revealed = !cards[cardIndex].revealed;
    this.setState({ cards });
  }
  handleMouseDown(cardIndex, e){
    e.preventDefault();
    const { x, y } = e;
    const { cards } = this.state;
    const card = cards.splice(cardIndex, 1)[0];
    cards.push(card);
    this.grabbedCard = {
      cardIndex: cards.length - 1,
      last: { x, y },
      from: { x: card.x, y: card.y }
    };
    this.setState({ cards })
  }
  handleMouseMove({ x, y }){
    if (!this.grabbedCard) return;
    const { cardIndex, last } = this.grabbedCard;
    const { cards, stacks } = this.state;
    cards[cardIndex].x += x - last.x;
    cards[cardIndex].y += y - last.y;
    this.grabbedCard.last = { x, y };
    this.setState({ cards });
  }
  handleMouseUp({ x, y }){
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