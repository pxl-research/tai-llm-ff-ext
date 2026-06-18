import {describe, it, expect, vi, beforeEach} from 'vitest';
import {stripJsonFence, parseLlmSuggestions, describeError, preview} from '../scripts/llm_response.js';

describe('stripJsonFence', () => {
    it('strips a ```json fence and trims surrounding whitespace', () => {
        const input = '```json\n[{"path":"/a"}]\n```';
        expect(stripJsonFence(input)).toBe('[{"path":"/a"}]');
    });

    it('strips a fence when the closing ``` has no leading newline', () => {
        expect(stripJsonFence('```json\n[]```')).toBe('[]');
    });

    it('strips a bare ``` fence (no language tag)', () => {
        expect(stripJsonFence('```\n[]\n```')).toBe('[]');
    });

    it('strips a fence with uppercase JSON tag', () => {
        expect(stripJsonFence('```JSON\n[]\n```')).toBe('[]');
    });

    it('leaves unfenced content untouched (but trimmed)', () => {
        expect(stripJsonFence('[{"path":"/a"}]')).toBe('[{"path":"/a"}]');
    });
});

describe('parseLlmSuggestions', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    const wrap = (content) => ({choices: [{message: {content}}]});

    it('parses a plain JSON array response', () => {
        const result = parseLlmSuggestions(wrap('[{"path":"/a","value":"x"}]'));
        expect(result).toEqual([{path: '/a', value: 'x'}]);
    });

    it('parses a fenced JSON array response', () => {
        const result = parseLlmSuggestions(wrap('```json\n[{"path":"/b"}]\n```'));
        expect(result).toEqual([{path: '/b'}]);
    });

    it('returns [] when llmResult is undefined', () => {
        expect(parseLlmSuggestions(undefined)).toEqual([]);
    });

    it('returns [] when llmResult is null', () => {
        expect(parseLlmSuggestions(null)).toEqual([]);
    });

    it('returns [] when there are no choices', () => {
        expect(parseLlmSuggestions({choices: []})).toEqual([]);
    });

    it('returns [] when the message content is empty', () => {
        expect(parseLlmSuggestions(wrap(''))).toEqual([]);
    });

    it('returns [] on malformed JSON', () => {
        expect(parseLlmSuggestions(wrap('not json'))).toEqual([]);
    });

    it('returns [] when the parsed JSON is an object, not an array', () => {
        expect(parseLlmSuggestions(wrap('{"path":"/a"}'))).toEqual([]);
    });

    it('returns [] when the parsed JSON is a primitive', () => {
        expect(parseLlmSuggestions(wrap('42'))).toEqual([]);
    });
});

describe('preview', () => {
    it('returns text untouched when at or below the max', () => {
        expect(preview('short text')).toBe('short text');
        expect(preview('x'.repeat(200))).toBe('x'.repeat(200));
    });

    it('truncates text longer than the max and appends a length marker', () => {
        const long = 'x'.repeat(250);
        expect(preview(long)).toBe(`${'x'.repeat(200)}… (truncated, 250 chars total)`);
    });

    it('respects a custom max', () => {
        expect(preview('hello world', 5)).toBe('hello… (truncated, 11 chars total)');
    });
});

describe('describeError', () => {
    const makeResponse = (status, statusText, jsonBody) => ({
        status,
        statusText,
        json: async () => {
            if (jsonBody === undefined) {
                throw new Error('not JSON');
            }
            return jsonBody;
        }
    });

    it('includes the API error message when present', async () => {
        const response = makeResponse(401, 'Unauthorized', {error: {message: 'No auth credentials found'}});
        await expect(describeError(response)).resolves.toBe(
            'LLM request failed (401): No auth credentials found'
        );
    });

    it('falls back to status + statusText when the body has no error message', async () => {
        const response = makeResponse(403, 'Forbidden', {something: 'else'});
        await expect(describeError(response)).resolves.toBe(
            'LLM request failed (403 Forbidden)'
        );
    });

    it('falls back to status + statusText when the body is not JSON', async () => {
        const response = makeResponse(500, 'Internal Server Error', undefined);
        await expect(describeError(response)).resolves.toBe(
            'LLM request failed (500 Internal Server Error)'
        );
    });
});
