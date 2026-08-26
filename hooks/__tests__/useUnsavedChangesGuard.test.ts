import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useUnsavedChangesGuard } from '../useUnsavedChangesGuard';

// happy-dom does not implement window.confirm, so provide it before spying.
const stubConfirm = (answer: boolean) => {
    const fn = vi.fn().mockReturnValue(answer);
    (window as any).confirm = fn;
    return fn;
};

afterEach(() => {
    vi.restoreAllMocks();
    delete (window as any).confirm;
});

const fireBeforeUnload = () => {
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    window.dispatchEvent(event);
    return event;
};

describe('useUnsavedChangesGuard', () => {
    it('does not block unloading when there is nothing unsaved', () => {
        renderHook(() => useUnsavedChangesGuard(false));
        expect(fireBeforeUnload().defaultPrevented).toBe(false);
    });

    it('blocks unloading while there are unsaved changes', () => {
        renderHook(() => useUnsavedChangesGuard(true));
        expect(fireBeforeUnload().defaultPrevented).toBe(true);
    });

    it('tracks the dirty flag without re-registering the listener', () => {
        const { rerender } = renderHook(({ dirty }) => useUnsavedChangesGuard(dirty), {
            initialProps: { dirty: false }
        });
        expect(fireBeforeUnload().defaultPrevented).toBe(false);

        rerender({ dirty: true });
        expect(fireBeforeUnload().defaultPrevented).toBe(true);

        rerender({ dirty: false });
        expect(fireBeforeUnload().defaultPrevented).toBe(false);
    });

    it('stops blocking once the screen unmounts', () => {
        const { unmount } = renderHook(() => useUnsavedChangesGuard(true));
        unmount();
        expect(fireBeforeUnload().defaultPrevented).toBe(false);
    });

    it('navigates straight through when clean, without prompting', () => {
        const confirmSpy = stubConfirm(true);
        const proceed = vi.fn();
        const { result } = renderHook(() => useUnsavedChangesGuard(false));

        act(() => { result.current.confirmNavigation(proceed); });

        expect(proceed).toHaveBeenCalledTimes(1);
        expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('asks before navigating away from unsaved work, and honours a cancel', () => {
        const confirmSpy = stubConfirm(false);
        const proceed = vi.fn();
        const { result } = renderHook(() => useUnsavedChangesGuard(true));

        let proceeded = true;
        act(() => { proceeded = result.current.confirmNavigation(proceed); });

        expect(confirmSpy).toHaveBeenCalledTimes(1);
        expect(proceed).not.toHaveBeenCalled();
        expect(proceeded).toBe(false);
    });

    it('navigates when the teacher confirms', () => {
        stubConfirm(true);
        const proceed = vi.fn();
        const { result } = renderHook(() => useUnsavedChangesGuard(true));

        let proceeded = false;
        act(() => { proceeded = result.current.confirmNavigation(proceed); });

        expect(proceed).toHaveBeenCalledTimes(1);
        expect(proceeded).toBe(true);
    });
});
