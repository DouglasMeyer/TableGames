import { html, render, Component } from 'https://unpkg.com/htm/preact/standalone.mjs';

const solitare = {
  name: 'Solitare',
  init: () => {
    const suites = 'Heart Diamond Spade Club'.split(' ');
    const deck = new Array(52).fill().map((_, i) => ({
      suite: suites[Math.floor(i / 13)],
      value: i % 13 + 1,
      yOffset: 0*0.2,
      xOffset: 0,
      interactable: false
    })).sort(_ => Math.random() - 0.5);
    const deal = count => deck.splice(0, count);
    const table = [ new Array(7).fill().map(() => []), new Array(7).fill().map(() => []) ];

    for (let i=0; i<7; i++) {
      for (let j=i; j<7; j++) {
        table[1][j].push({ ...deal(1)[0], revealed: j === i, interactable: j === i, yOffset: i*0.05 })
      }
    }
    table[0][0] = deck.map(card => ({ ...card, interactable: true }));

    return {
      width: 7,
      height: 2 + 6*0.05 + (12-3)*0.2,
      table,
      moving: []
    };
  },
  grab(state, rowIndex, stackIndex, cardIndex) {
    state.moving = state.table[rowIndex][stackIndex].splice(cardIndex, 1);
    return state;
  },
  release(state, rowIndex, stackIndex, cardIndex) {
    state.table[rowIndex][stackIndex].splice(cardIndex, 0, ...state.moving);
    state.moving = [];
    return state;
  }
};

const games = [
  solitare
];

class GameSelector extends Component {
  constructor(props) {
    super(props);
    this.handleSelectGame = this.handleSelectGame.bind(this);
  }

  handleSelectGame() {
    const input = this.base.querySelector('input[type="radio"]:checked');
    if (!input) return;

    const game = games.find(g => g.name === input.value);
    this.props.onSelect(game);
  }

  render() {
    return html`<div>
      ${games.map(game =>
        html`<input type="radio" value=${game.name} class="hero" />`
      )}
      <button onClick=${this.handleSelectGame}>Start Game</button>
    </div>`;
  }
}

class Card extends Component {
  constructor(props) {
    super(props);
    this.handleMouseDown = props.onMouseDown.bind(null, props.rowIndex, props.stackIndex, props.cardIndex);
    // this.handleMouseUp = props.onMouseUp.bind(null, props.rowIndex, props.stackIndex, props.cardIndex);
  }

  render({ revealed, value, suite, x, y, interactable }) {
    return html`<use
      xlink:href=${`./Contemporary_playing_cards.svg#${revealed ? `${value}_${suite}` : 'Back'}`}
      x=${x} y=${y}
      class=${interactable ? 'interactable' : ''}
      onMouseDown=${this.handleMouseDown}
    />`;
    // onMouseUp=${this.handleMouseUp}
  }
}

class TableGames extends Component {
  constructor(props) {
    super(props);
    this.state = {
      game: null
    };
    this.movingStart = {};
    this.startGame = this.startGame.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.startGame(solitare);
  }

  startGame(game) {
    log('game', game);
    this.setState({
      game: { game, state: game.init() }
    });
  }

  handleMouseDown(rowIndex, stackIndex, cardIndex, { x, y }){
    console.log('handleMouseDown', ...arguments);
    const { game: { game, state } } = this.state;
    const newState = game.grab(state, rowIndex, stackIndex, cardIndex);
    newState.moving.forEach(card => {
      card.x = stackIndex;
      card.y = rowIndex;
    });
    this.movingStart = { x, y };
    this.setState({
      game: { game, state: newState },
      movingDelta: { x: 0, y: 0 }
    });
  }
  handleMouseUp({ x, y }){
    console.log('handleMouseUp', ...arguments);
    const { game: { game, state } } = this.state;
    this.setState({ game: {
      game,
      state: game.release(state, rowIndex, stackIndex, cardIndex),
    }});
  }
  handleMouseMove({ x, y }){
    this.setState({
      movingDelta: {
        x: x - this.movingStart.x,
        y: y - this.movingStart.y
      }
    });
  }

  render({}, { game }) {
    if (!game) return html`<${GameSelector} onSelect=${this.startGame} />`;
    return html `<div style="height: 100%; width: 100%;">
      <svg
        style="height: 100%; width: 100%; font-size: 12px;"
        viewBox=${`-10 -10 ${game.state.width * (72 + 10) + 10} ${game.state.height * (110 + 10) + 10}`}
        onMouseMove=${this.handleMouseMove}
        onMouseUp=${this.handleMouseUp}
      >
        ${game.state.table.map((row, rowIndex) =>
          row.map((stack, stackIndex) =>
            stack.map((card, cardIndex) =>
              html`<${Card} ...${card} ...${{ rowIndex, stackIndex, cardIndex }}
                x=${`${100/game.state.width*(stackIndex+card.xOffset)}%`}
                y=${`${100/game.state.height*(rowIndex+card.yOffset)}%`}
                onMouseDown=${this.handleMouseDown}
              />`
            )
          ).reduce((a,b) => a.concat(b))
        ).reduce((a,b) => a.concat(b)).concat(
          game.state.moving.map(card =>
            html`<${Card} ...${card}
              x=${`calc(${100/game.state.width*(card.x+card.xOffset)}% + ${this.state.movingDelta.x}px)`}
              y=${`calc(${100/game.state.height*(card.y+card.yOffset)}% + ${this.state.movingDelta.y}px)`}
            />`
          )
        )}
      </svg>
    </div>`;
  }
}
render(html`<${TableGames} />`, document.body);