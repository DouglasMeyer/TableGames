let gamePromise;
let unsubscribe;
let actions;
let items;

function loadGame(url) {
  importScripts(url);
}

function startGame() {
  if (unsubscribe) unsubscribe();
  items = {};
  unsubscribe = game((itemId, item) => {
    if (itemId === null) {
      actions = item.actions;
      item.actions = Object.keys(actions || {});
      postMessage({ itemId, item });
    } else {
      items[itemId] = item;
      const { id, width, height, x, y, image } = item;
      postMessage({ itemId, item: { id, width, height, x, y, image } });
    }
  });
}

function endGame() {
  if (unsubscribe) unsubscribe();
  unsubscribe = null;
  actions = null;
}

function pickItem(itemId, event) {
  const healdItems = (items[itemId].pick(event) || []).map(item => item.id);
  postMessage({ healdItems });
}
function placeItem(itemId, event, itemIds) {
  const cards = itemIds.map(id => items[id]);
  items[itemId].place(event, cards);
}

onmessage = function({ data }) {
  const { type, url, action, itemId, cards, event } = data;

  if (type === 'init') loadGame(url);
  else if (type === 'start') startGame();
  else if (type === 'end') endGame();
  else if (type === 'action') actions[action]();
  else if (type === 'pick') pickItem(itemId, event);
  else if (type === 'place') placeItem(itemId, event, cards);
}
