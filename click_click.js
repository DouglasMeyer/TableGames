const width = 72;
const height = 110;
const suits = 'Heart Diamond Spade Club'.split(' ');
const cards = new Array(52).fill().map((_, index) => ({
  id: index,
  suit: suits[Math.floor(index / 13)],
  value: index % 13 + 1,
  width, height
}));

function game(fn){
  fn(null, { width: 10 * width, height: 5 * height });
  cards.forEach(card => {
    card.image = `/Contemporary_playing_cards.svg#${card.value}_${card.suit}`;
    card.pick = function(){
      card.x = Math.random() * (10-1) * width;
      card.y = Math.random() * (5-1) * height;
      fn(card.id, card);
    };
    card.pick();
  });
};
