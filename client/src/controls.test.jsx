import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import FullAIExamples, { useFullAIExamples } from './components/FullAIExamples';
import AIReport from './components/AIReport';
import AIWorkspace from './components/AIWorkspace';
import FeaturePage from './pages/FeaturePage';

global.IS_REACT_ACT_ENVIRONMENT = true;

function NativeFixture() {
  const controller = useFullAIExamples();
  const [fields, setFields] = useState({ required: '', optional: '', source_id: 'real-42', facts: '{"count":0,"verified":false,"note":""}' });
  const bind = (key) => controller.bind({ current: fields[key], label: key, change: e => setFields(previous => ({ ...previous, [key]: e.target.value })), json: key === 'facts' }, key, key);
  return <div data-full-ai-workspace="fixture"><FullAIExamples controller={controller} />
    {Object.keys(fields).map(key => <label key={key}>{key}<input data-full-ai-field={bind(key)} value={fields[key]} onChange={e => setFields(previous => ({ ...previous, [key]: e.target.value }))} /></label>)}
  </div>;
}

test('native presets fill required and optional fields without generation and retain real references', () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<NativeFixture />));
  expect(host.querySelectorAll('button[type="button"]')).toHaveLength(3);
  act(() => host.querySelector('button').click());
  const values = [...host.querySelectorAll('input')].map(input => input.value);
  expect(values[0]).toContain('Fictional');
  expect(values[1]).toContain('Fictional');
  expect(values[2]).toBe('real-42');
  expect(JSON.parse(values[3])).toMatchObject({ count: 0, verified: false });
  expect(JSON.parse(values[3]).note).toContain('Fictional');
  expect(host.querySelector('[role="status"]').textContent).toContain('Generation remains a separate action');
  act(() => root.unmount()); host.remove();
});

test('returned and saved JSON renders sections, facts, lists, and tables while retaining falsy values', () => {
  const data = { result: { summary: { approved: false, count: 0, note: '' }, items: [{ label: 'One', done: false }, { label: 'Two', done: true }], questions: ['First', 'Second'] } };
  for (const response of [data, { ...data, id: 3, input: {}, model: 'fixture' }]) {
    const html = renderToStaticMarkup(<AIReport response={response} title="Fixture" />);
    expect(html).toContain('Summary');
    expect(html).toContain('Approved');
    expect(html).toContain('No');
    expect(html).toContain('>0<');
    expect(html).toContain('<dd></dd>');
    expect(html).toContain('<table');
    expect(html).toContain('<ul>');
    expect(html).not.toContain('"approved":false');
  }
});


test('demo control fills configured fixture credentials without submitting', () => {
  const previous = { enabled: process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL, email: process.env.REACT_APP_DEMO_EMAIL, password: process.env.REACT_APP_DEMO_PASSWORD };
  process.env.REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL = 'true';
  process.env.REACT_APP_DEMO_EMAIL = 'fixture@example.invalid';
  process.env.REACT_APP_DEMO_PASSWORD = 'fixture-only';
  const { MemoryRouter } = require('react-router-dom');
  const API = require('./services/api').default;
  const LoginPage = require('./pages/LoginPage').default;
  const post = jest.spyOn(API, 'post').mockResolvedValue({ data: {} });
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<MemoryRouter><LoginPage /></MemoryRouter>));
  const button = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Fill Demo Credentials'));
  expect(button.disabled).toBe(false);
  act(() => button.click());
  expect(host.querySelector('#email').value).toBe(process.env.REACT_APP_DEMO_EMAIL);
  expect(host.querySelector('#password').value).toBe(process.env.REACT_APP_DEMO_PASSWORD);
  expect(post).not.toHaveBeenCalled();
  act(() => root.unmount()); host.remove(); post.mockRestore();
  for (const [key, value] of Object.entries({ REACT_APP_ENABLE_DEMO_CREDENTIAL_AUTOFILL: previous.enabled, REACT_APP_DEMO_EMAIL: previous.email, REACT_APP_DEMO_PASSWORD: previous.password })) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});


test('saved workspace history opens a structured detail report', async () => {
  const item = { id: 7, model: 'fixture', created_at: '2026-10-10T12:00:00Z', input: { goal: '' }, result: { summary: { approved: false, count: 0, note: '' }, steps: ['Review', 'Confirm'] } };
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ items: [item] }) }));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<AIWorkspace feature={{ id: 'fixture', title: 'Fixture report', description: 'Fixture' }} />));
  expect(host.textContent).toContain('Saved reports');
  const row = host.querySelector('.ai-history-row');
  expect(row).not.toBeNull();
  act(() => row.click());
  const dialog = document.body.querySelector('.ai-workspace-dialog');
  expect(dialog.textContent).toContain('Summary');
  expect(dialog.textContent).toContain('Approved');
  expect(dialog.textContent).toContain('No');
  expect(dialog.textContent).toContain('0');
  expect(dialog.querySelector('pre')).toBeNull();
  act(() => root.unmount()); host.remove(); global.fetch = previousFetch;
});


test('native timeline page fills its required summary and optional events without a request', () => {
  const Page = require('./pages/AIFeaturesNewPage').default;
  const API = require('./services/api').default;
  const post = jest.spyOn(API, 'post').mockResolvedValue({ data: {} });
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<Page />));
  const button = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Fill all fields'));
  expect(button).toBeDefined();
  act(() => button.click());
  const fields = [...host.querySelectorAll('.ai-card-body textarea')];
  expect(fields).toHaveLength(2);
  expect(fields[0].value.length).toBeGreaterThan(20);
  expect(Array.isArray(JSON.parse(fields[1].value))).toBe(true);
  expect(post).not.toHaveBeenCalled();
  act(() => root.unmount()); host.remove(); post.mockRestore();
});


test('legacy AI page exposes presets on expansion and fills its prompt without a request', () => {
  const Page = require('./pages/AIFeaturesPage').default;
  const API = require('./services/api').default;
  const post = jest.spyOn(API, 'post').mockResolvedValue({ data: {} });
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<Page />));
  act(() => host.querySelector('.ai-card-header').click());
  const button = [...host.querySelectorAll('button')].find(node => node.textContent.includes('Fill all fields'));
  expect(button).toBeDefined();
  act(() => button.click());
  expect(host.querySelector('.ai-card-body input, .ai-card-body textarea').value.length).toBeGreaterThan(20);
  expect(post).not.toHaveBeenCalled();
  act(() => root.unmount()); host.remove(); post.mockRestore();
});

test('advisory workspace presets fill required and optional inputs without a request', async () => {
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ items: [] }) }));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<AIWorkspace feature={{ id: 'fixture', title: 'Fixture report', description: 'Fixture' }} />));
  act(() => host.querySelector('.ai-preset-bar button').click());
  expect(host.querySelector('#fixture-input').value.length).toBeGreaterThan(20);
  expect(host.querySelector('#fixture-context').value.length).toBeGreaterThan(20);
  expect(host.querySelector('#fixture-deadline').value).not.toBe('');
  expect(global.fetch.mock.calls.every(([url]) => String(url).includes('/runs?'))).toBe(true);
  act(() => root.unmount()); host.remove(); global.fetch = previousFetch;
});

test('record table renders 20 project seed jobs from the paginated API shape', async () => {
  const fs = require('fs');
  const path = require('path');
  const seed = fs.readFileSync(path.join(__dirname, '../../server/seed.js'), 'utf8');
  const block = seed.match(/INSERT INTO jobs \(case_name, case_number,[\s\S]*?\) VALUES\n([\s\S]*?);/)[1];
  const jobs = [...block.matchAll(/^\s*\('([^']+)', '([^']+)', '([^']+)'/gm)]
    .map((match) => ({ case_name: match[1], case_number: match[2], job_type: match[3] }));
  expect(jobs).toHaveLength(20);
  const API = require('./services/api').default;
  const get = jest.spyOn(API, 'get').mockResolvedValue({ data: { data: jobs, pagination: { total: jobs.length, page: 1, limit: 20 } } });
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<FeaturePage title="Jobs" endpoint="/jobs" columns={[{ key: 'case_name', label: 'Case Name' }, { key: 'case_number', label: 'Case Number' }]} formFields={[]} />));
  expect(host.querySelectorAll('tbody .table-row')).toHaveLength(20);
  expect(host.textContent).toContain(jobs[0].case_name);
  expect(get).toHaveBeenCalledWith('/jobs', { params: {} });
  act(() => root.unmount()); host.remove(); get.mockRestore();
});

test('record table rejects a malformed list payload without a render exception', async () => {
  const API = require('./services/api').default;
  const { toast } = require('react-toastify');
  const get = jest.spyOn(API, 'get').mockResolvedValue({ data: { data: { unexpected: true } } });
  const error = jest.spyOn(toast, 'error').mockImplementation(() => {});
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<FeaturePage title="Jobs" endpoint="/jobs" columns={[{ key: 'case_name', label: 'Case Name' }]} formFields={[]} />));
  expect(host.querySelectorAll('tbody .table-row')).toHaveLength(0);
  expect(host.textContent).toContain('No items found.');
  expect(error).toHaveBeenCalledWith(expect.stringContaining('invalid record list'));
  act(() => root.unmount()); host.remove(); get.mockRestore(); error.mockRestore();
});
