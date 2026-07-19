Here's the unit test code for `cupidon.js` using Jest:

`javascript
const { onStart } = require('./cupidon');
const { expect } = require('@jest/globals');

// Mock dependencies
const mockApi = {
  sendMessage: jest.fn(),
  getThreadInfo: jest.fn()
};

const mockEvent = {
  threadID: '123',
  messageID: '456',
  mentions: {},
  senderID: '789'
};

const mockMessage = {
  reply: jest.fn()
};

describe('cupidon command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should require at least 2 users', async () => {
    await onStart({
      api: mockApi,
      event: { ...mockEvent, mentions: {} },
      args: []
    });

    expect(mockApi.sendMessage).toHaveBeenCalledWith(
      "Need at least 2 users!",
      '123'
    );
  });

  test('should pair users correctly with even number', async () => {
    const mentions = {
      'user1': { id: '1', name: 'Alice' },
      'user2': { id: '2', name: 'Bob' },
      'user3': { id: '3', name: 'Charlie' },
      'user4': { id: '4', name: 'Diana' }
    };

    await onStart({
      api: mockApi,
      event: { ...mockEvent, mentions },
      args: ['@Alice', '@Bob', '@Charlie', '@Diana']
    });

    expect(mockApi.sendMessage.mock.calls[0][0]).toMatch(/Pairs:/);
    expect(mockApi.sendMessage.mock.calls[0][0]).toMatch(/Alice & Bob/);
    expect(mockApi.sendMessage.mock.calls[0][0]).toMatch(/Charlie & Diana/);
  });

  test('should handle odd number of users', async () => {
    const mentions = {
      'user1': { id: '1', name: 'Alice' },
      'user2': { id: '2', name: 'Bob' },
      'user3': { id: '3', name: 'Charlie' }
    };

    await onStart({
      api: mockApi,
      event: { ...mockEvent, mentions },
      args: ['@Alice', '@Bob', '@Charlie']
    });

    expect(mockApi.sendMessage.mock.calls[0][0]).toMatch(/Pairs:/);
    expect(mockApi.sendMessage.mock.calls[0][0]).toMatch(/Alice & Bob/);
    expect(mockApi.sendMessage.mock.calls[0][0]).toMatch(/Charlie is waiting/);
  });

  test('should handle API errors gracefully', async () => {
    mockApi.sendMessage.mockRejectedValue(new Error('API failure'));

    const mentions = {
      'user1': { id: '1', name: 'Alice' },
      'user2': { id: '2', name: 'Bob' }
    };

    await onStart({
      api: mockApi,
      event: { ...mockEvent, mentions },
      args: ['@Alice', '@Bob']
    });

    expect(mockApi.sendMessage).toHaveBeenCalled();
  });

  test('should use message.reply when available', async () => {
    const mentions = {
      'user1': { id: '1', name: 'Alice' },
      'user2': { id: '2', name: 'Bob' }
    };

    await onStart({
      api: mockApi,
      event: mockEvent,
      message: mockMessage,
      args: ['@Alice', '@Bob']
    });

    expect(mockMessage.reply).toHaveBeenCalled();
    expect(mockApi.sendMessage).not.toHaveBeenCalled();
  });
});
`

Key test cases covered:
1. Input validation (minimum 2 users)
2. Pairing logic with even number of users
3. Handling odd number of users
4. Error handling for API failures
5. Message.reply vs api.sendMessage behavior

The tests mock all external dependencies and verify both happy paths and error cases. You'll need to install Jest (`npm install --save-dev jest`) to run these tests.