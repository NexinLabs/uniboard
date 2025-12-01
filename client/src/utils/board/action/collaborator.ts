import api from "../../api";


interface CollaboratorContext {
    id: string;
    collaborators: any[];
    setCollaborators: (collaborators: any[]) => void;
    userId: string;
    isReadOnly: () => boolean;
    setActiveCollaboratorMenu: (menu: string | null) => void;
}

export default class Collaborator{

    static async handleRemoveCollaborator(context : CollaboratorContext) {
        if (context.isReadOnly()) return;
        const previousCollaborators = [...context.collaborators];
        const newCollaborators = context.collaborators.filter(c => (c.user?._id || c.user) !== context.userId);

        context.setCollaborators(newCollaborators);
        context.setActiveCollaboratorMenu(null);

        try {
            const res = await api.delete(`/api/boards/${context.id}/collaborators/${context.userId}`);
            // Sync with server response
            const editors = (res.data.editors || []).map((u: any) => ({ user: u, role: 'editor' }));
            const viewers = (res.data.viewers || []).map((u: any) => ({ user: u, role: 'viewer' }));
            context.setCollaborators([...editors, ...viewers]);
        } catch (error) {
            console.error("Failed to remove collaborator", error);
            context.setCollaborators(previousCollaborators);
        }
    };


    static async handleUpdateCollaboratorRole(context : CollaboratorContext, newRole: 'viewer' | 'editor') {
        if (context.isReadOnly()) return;
        const previousCollaborators = [...context.collaborators];
        const newCollaborators = context.collaborators.map(c => {
            if ((c.user?._id || c.user) === context.userId) {
                return { ...c, role: newRole };
            }
            return c;
        });

        context.setCollaborators(newCollaborators);
        context.setActiveCollaboratorMenu(null);

        try {
            const res = await api.put(`/api/boards/${context.id}/collaborators/${context.userId}`, { role: newRole });
            // Sync with server response
            const editors = (res.data.editors || []).map((u: any) => ({ user: u, role: 'editor' }));
            const viewers = (res.data.viewers || []).map((u: any) => ({ user: u, role: 'viewer' }));
            context.setCollaborators([...editors, ...viewers]);
        } catch (error) {
            console.error("Failed to update role", error);
            context.setCollaborators(previousCollaborators);
        }
    };


} 