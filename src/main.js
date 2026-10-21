import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Detail from './views/Detail.vue'
import Edit from './views/Edit.vue'
import Manage from './views/Manage.vue'
import Settings from './views/Settings.vue'
import Categories from './views/Categories.vue'
import './style.css'
import './appearance.css'
const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 100, behavior: 'smooth' } : { top: 0 }),
  routes: [
    { path: '/', component: Home },
    { path: '/posts/:id', component: Detail },
    { path: '/posts/:id/edit', component: Edit },
    { path: '/manage', component: Manage },
    { path: '/settings', component: Settings },
    { path: '/categories', component: Categories },
    { path: '/:pathMatch(.*)*', component: Detail },
  ],
})
createApp(App).use(router).mount('#app')
