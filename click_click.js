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
      actions: [ 'boom' ]
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

// eslint-disable-next-line no-undef
onmessage = function({ data }){
  if (data.type === 'start') start(data);
  else if (data.type === 'resize') resize(data);
  // else if (data.type === 'end') // end(); {}
  else if (data.type === 'action' && data.action === 'boom') boom();
  else if (data.type === 'pick') pick(data);
  // else if (data.type === 'place') place(data);
};
