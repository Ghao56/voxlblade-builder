import { mount } from 'svelte'
import App from './App.svelte'
import './app.css'
import { inject } from '@vercel/analytics'

inject()

mount(App, { target: document.getElementById('app')! })