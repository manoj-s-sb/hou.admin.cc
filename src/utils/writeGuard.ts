import { toast } from 'react-hot-toast';

import { canEditModule } from '../rbac';

/**
 * Wraps a click handler with a write-permission check.
 * If the user lacks edit access for the given moduleId, shows a toast and
 * swallows the event — no API call is made.
 *
 * Usage:
 *   <button onClick={guardWrite(MODULES.TICKETS, () => openEditDrawer(row))}>Edit</button>
 */
export const guardWrite =
  (moduleId: string, handler: (...args: unknown[]) => void) =>
  (...args: unknown[]) => {
    if (!canEditModule(moduleId)) {
      toast.error("You don't have edit access to this module.", { id: 'no-edit-access' });
      return;
    }
    handler(...args);
  };
