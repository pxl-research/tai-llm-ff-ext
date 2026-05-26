import {describe, it, expect, vi, beforeEach} from 'vitest';
import {stripJsonFence, parseLlmSuggestions} from '../scripts/llm_response.js';

describe('stripJsonFence', () => {
    it('strips a ```json fence with a trailing newline', () => {
        const input = '```json\n[{"path":"/a"}]\n```';
        expect(stripJsonFence(input)).toBe('[{"path":"/a"}]\n');
    });

    it('strips a fence when the closing ``` has no leading newline', () => {
        expect(stripJsonFence('```json\n[]```')).toBe('[]');
    });

    it('leaves unfenced content untouched', () => {
        expect(stripJsonFence('[{"path":"/a"}]')).toBe('[{"path":"/a"}]');
    });

    it('only strips a json fence, not a bare ``` fence at the start', () => {
        const input = '```\n[]\n```';
        expect(stripJsonFence(input)).toBe('```\n[]\n');
    });
});

describe('parseLlmSuggestions', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
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
});
