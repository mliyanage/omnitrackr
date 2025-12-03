import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  mockConnection,
  mockSchedule,
  mockDepartment,
  mockWatcher,
  mockConnections,
  mockSchedules,
  mockDepartments,
  mockWatchers,
} from './mockData';

// Match all origins for API paths (since baseURL might be undefined in tests)
const API_URL = '*/api';

// MSW request handlers
export const handlers = [
  // ========== Connections ==========
  http.get(`${API_URL}/source-connections`, () => {
    return HttpResponse.json({
      success: true,
      data: mockConnections,
    });
  }),

  http.get(`${API_URL}/source-connections/:id`, ({ params }) => {
    const { id } = params;
    const connection = mockConnections.find((c) => c.id === Number(id));

    if (!connection) {
      return HttpResponse.json(
        { success: false, error: { message: 'Connection not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: connection,
    });
  }),

  http.post(`${API_URL}/source-connections`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...mockConnection, ...body, id: Math.floor(Math.random() * 1000) },
    });
  }),

  http.put(`${API_URL}/source-connections/:id`, async ({ request, params }) => {
    const body = await request.json();
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: { ...mockConnection, ...body, id: Number(id) },
    });
  }),

  http.delete(`${API_URL}/source-connections/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_URL}/source-connections/test`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        success: true,
        message: 'Connection test successful',
        details: {
          objects_found: 10,
          connection_time_ms: 150,
        },
      },
    });
  }),

  // ========== Schedules ==========
  http.get(`${API_URL}/schedules`, () => {
    return HttpResponse.json({
      success: true,
      data: mockSchedules,
    });
  }),

  http.get(`${API_URL}/schedules/:id`, ({ params }) => {
    const { id } = params;
    const schedule = mockSchedules.find((s) => s.id === Number(id));

    if (!schedule) {
      return HttpResponse.json(
        { success: false, error: { message: 'Schedule not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: schedule,
    });
  }),

  http.post(`${API_URL}/schedules`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...mockSchedule, ...body, id: Math.floor(Math.random() * 1000) },
    });
  }),

  http.put(`${API_URL}/schedules/:id`, async ({ request, params }) => {
    const body = await request.json();
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: { ...mockSchedule, ...body, id: Number(id) },
    });
  }),

  http.delete(`${API_URL}/schedules/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_URL}/schedules/:id/next-run`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        next_run_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        schedule_id: Number(params.id),
      },
    });
  }),

  // ========== Departments (RefData) ==========
  http.get(`${API_URL}/ref-data/departments`, () => {
    return HttpResponse.json({
      success: true,
      data: mockDepartments,
    });
  }),

  http.get(`${API_URL}/ref-data/timezones`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 1, code: 'TIMEZONE:America/New_York', value1: 'America/New_York' },
        { id: 2, code: 'TIMEZONE:America/Los_Angeles', value1: 'America/Los_Angeles' },
        { id: 3, code: 'TIMEZONE:Europe/London', value1: 'Europe/London' },
        { id: 4, code: 'TIMEZONE:Asia/Tokyo', value1: 'Asia/Tokyo' },
      ],
    });
  }),

  http.get(`${API_URL}/ref-data/:id`, ({ params }) => {
    const { id } = params;
    const refData = mockDepartments.find((d) => d.id === Number(id));

    if (!refData) {
      return HttpResponse.json(
        { success: false, error: { message: 'Reference data not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: refData,
    });
  }),

  http.post(`${API_URL}/ref-data`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...mockDepartment, ...body, id: Math.floor(Math.random() * 1000) },
    });
  }),

  http.put(`${API_URL}/ref-data/:id`, async ({ request, params }) => {
    const body = await request.json();
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: { ...mockDepartment, ...body, id: Number(id) },
    });
  }),

  http.delete(`${API_URL}/ref-data/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  // ========== Watchers ==========
  http.get(`${API_URL}/watchers`, () => {
    return HttpResponse.json({
      success: true,
      data: mockWatchers,
    });
  }),

  http.get(`${API_URL}/watchers/:id`, ({ params }) => {
    const { id } = params;
    const watcher = mockWatchers.find((w) => w.id === Number(id));

    if (!watcher) {
      return HttpResponse.json(
        { success: false, error: { message: 'Watcher not found' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({
      success: true,
      data: watcher,
    });
  }),

  http.post(`${API_URL}/watchers`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...mockWatcher, ...body, id: Math.floor(Math.random() * 1000) },
    });
  }),

  http.put(`${API_URL}/watchers/:id`, async ({ request, params }) => {
    const body = await request.json();
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: { ...mockWatcher, ...body, id: Number(id) },
    });
  }),

  http.delete(`${API_URL}/watchers/:id`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.post(`${API_URL}/watchers/:id/poll`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        watcher_id: Number(params.id),
        poll_status: 'success',
        objects_detected: 3,
        files_new: 2,
      },
    });
  }),
];

// Create MSW server
export const server = setupServer(...handlers);

// Start/stop helpers
export const startMockServer = () => {
  server.listen({ onUnhandledRequest: 'warn' });
};

export const stopMockServer = () => {
  server.close();
};

export const resetMockHandlers = () => {
  server.resetHandlers();
};
