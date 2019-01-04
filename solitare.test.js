import Solitare from './solitare';

const origMath = global.Math;
beforeEach(() => {
  global.Math = Object.create(global.Math);
  global.Math.random = () => 0;
});

const suits = 'Heart Diamond Spade Club'.split(' ');
const suitSymbols = '♡ ♢ ♤ ♧'.split(' ');
const cardToStr = ({ suit, value }) => `${value} ${suitSymbols[suits.indexOf(suit)]}`;

test('has stacks', () => {
  const solitare = new Solitare();
  expect(solitare.items.length).toEqual(2 + 4 + 7);
  expect(solitare.drawStack.items.length).toEqual(52 - 1 - 2 - 3 - 4 - 5 - 6 - 7);
  expect(solitare.discardStack.items.length).toEqual(0);
  expect(solitare.goalStacks.map(stack => stack.items.length).reduce((a,b) => a+b)).toEqual(0);
  for (let i=0; i<7; i++) {
    expect(solitare.cascadingStacks[i].items.length).toEqual(i+1);
  }
});

test('can draw a card', () => {
  const solitare = new Solitare();
  const card = solitare.drawStack.items.slice(-1)[0].pick();
  expect(solitare.drawStack.items.length).toEqual(52-1-2-3-4-5-6-7-1);
  expect(solitare.discardStack.items.length).toEqual(1);
  expect(solitare.discardStack.items[0]).toMatchObject({
    id: 14, suit: 'Diamond', value: 2, revealed: true
  });
});

test('can place card', () => {
  const solitare = new Solitare();
  const heart12 = solitare.cascadingStacks[4].items[4];
  expect(heart12).toMatchObject({ suit: 'Heart', value: 12 });
  const spade13 = solitare.cascadingStacks[6].items[6];
  expect(spade13).toMatchObject({ suit: 'Spade', value: 13 });
  heart12.pick();
  expect(solitare.cascadingStacks[4].items.length).toEqual(5-1);
  expect(solitare.holdingStack.items.length).toEqual(1);
  expect(solitare.holdingStack.items[0]).toBe(heart12);
  spade13.place(heart12);
  expect(solitare.cascadingStacks[6].items.slice(-1)).toEqual([ heart12 ]);
  expect(solitare.cascadingStacks[6].items.length).toEqual(7+1);
});
