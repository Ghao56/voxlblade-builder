import { mount } from 'svelte'
import App from './App.svelte'
import 'font-awesome/css/font-awesome.min.css'
import './app.css'

mount(App, { target: document.getElementById('app')! })