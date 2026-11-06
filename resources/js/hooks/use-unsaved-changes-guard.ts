import { router } from '@inertiajs/react';
import { useEffect } from 'react';

export type UnsavedChangesGuardOptions = {
    enabled?: boolean;
    message?: string;
};

/**
 * Guard one editing page/workspace. Inertia visits use a synchronous native
 * confirm; browser unload prompts remain browser-owned. Back/Forward cannot be
 * blocked by Inertia's before event. This is a warning, not a data-loss guarantee.
 * Use the caller's isDirty (e.g. useForm); saves must update its defaults on success.
 * Native confirm is intentional: the async ConfirmationProvider cannot return a
 * synchronous cancellation decision, and cancelling/replaying saves is unsafe.
 */
export function useUnsavedChangesGuard(
    isDirty: boolean,
    {
        enabled = true,
        message = 'You have unsaved changes. Leave this page?',
    }: UnsavedChangesGuardOptions = {},
): void {
    useEffect(() => {
        if (!enabled || !isDirty || typeof window === 'undefined') {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = '';
        };
        const removeBeforeListener = router.on('before', (event) => {
            const visit = event.detail.visit;
            const isRequestNavigation =
                visit.method.toLowerCase() === 'get' &&
                !visit.async &&
                !visit.prefetch &&
                !isSameDocumentHashNavigation(visit.url);

            if (isRequestNavigation && !window.confirm(message)) {
                event.preventDefault();

                return false;
            }
        });

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            removeBeforeListener();
        };
    }, [enabled, isDirty, message]);
}

function isSameDocumentHashNavigation(url: URL): boolean {
    return (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash !== window.location.hash
    );
}
