import { createContext, useEffect, useReducer, type ReactNode, type Dispatch } from "react";

interface User {
    _id: string;
    username: string;
    displayName?: string;
    email: string;
    token: string;
}

interface State {
    user: User | null;
    loading: boolean;
    error: any;
}

interface Action {
    type: string;
    payload?: any;
}

const INITIAL_STATE: State = {
    user: JSON.parse(localStorage.getItem("user") || "null"),
    loading: false,
    error: null,
};

export const AuthContext = createContext<{
    user: User | null;
    loading: boolean;
    error: any;
    dispatch: Dispatch<Action>;
}>({
    ...INITIAL_STATE,
    dispatch: () => null,
});

const AuthReducer = (state: State, action: Action): State => {
    switch (action.type) {
        case "LOGIN_START":
            return { user: null, loading: true, error: null };
        case "LOGIN_SUCCESS":
            return { user: action.payload, loading: false, error: null };
        case "LOGIN_FAILURE":
            return { user: null, loading: false, error: action.payload };
        case "LOGOUT":
            return { user: null, loading: false, error: null };
        default:
            return state;
    }
};

export const AuthContextProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = useReducer(AuthReducer, INITIAL_STATE);

    useEffect(() => {
        localStorage.setItem("user", JSON.stringify(state.user));
    }, [state.user]);

    return (
        <AuthContext.Provider
            value={{
                user: state.user,
                loading: state.loading,
                error: state.error,
                dispatch,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
