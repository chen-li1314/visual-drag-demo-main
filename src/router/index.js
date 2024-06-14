import Vue from 'vue'
import Router from 'vue-router'
import Demo from '../views/Demo.vue'


Vue.use(Router)

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('@/views/Home'),
    },
    {
        path: '/demo',
        name: 'Demo',
        component: Demo,
    },
]

export default new Router({
    mode: 'hash',
    base: process.env.BASE_URL,
    routes,
})
