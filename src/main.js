import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import Detail from './views/Detail.vue'
import Edit from './views/Edit.vue'
import Manage from './views/Manage.vue'
import './style.css'
const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', component: Home },
    { path: '/posts/:id', component: Detail },
    { path: '/posts/:id/edit', component: Edit },
    { path: '/manage', component: Manage },
    { path: '/:pathMatch(.*)*', component: Detail },
  ],
})
createApp(App).use(router).mount('#app')
