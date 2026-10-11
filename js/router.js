// Hash-Router: zeigt je nach Teil hinter dem # (#/heute, #/dump, …) genau einen Screen an.
// Der Browser löst bei jeder Änderung des Hash ein «hashchange»-Event aus, ohne die Seite neu zu laden.

const DEFAULT_ROUTE = 'heute';
const routes = {}; // name -> { screen, tab, onEnter }

// Meldet einen Screen an. onEnter läuft bei jedem Betreten des Screens.
export function registerRoute(name, onEnter) {
  routes[name] = {
    screen: document.querySelector(`.screen[data-route="${name}"]`),
    tab: document.querySelector(`.tabbar [data-tab="${name}"]`),
    onEnter,
  };
}

function currentRoute() {
  const name = location.hash.replace(/^#\/?/, '').split('?')[0];
  return routes[name] ? name : DEFAULT_ROUTE;
}

function render() {
  const active = currentRoute();
  document.body.dataset.route = active; // erlaubt CSS pro Screen, z. B. breiteres Layout beim Planen
  for (const [name, route] of Object.entries(routes)) {
    const isActive = name === active;
    route.screen.hidden = !isActive;
    if (route.tab) {
      route.tab.classList.toggle('active', isActive);
      if (isActive) route.tab.setAttribute('aria-current', 'page');
      else route.tab.removeAttribute('aria-current');
    }
  }
  routes[active].onEnter?.(routes[active].screen);
  window.scrollTo(0, 0);
}

export function startRouter() {
  window.addEventListener('hashchange', render);
  render();
}
