import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface IInitialState {
    isMobileMenuActive: boolean,
    isCartVisible: boolean,
    isPopupVisible: boolean,
    popupType: 'lead' | '',
    popupTitle: string,
}

const initialState: IInitialState = {
    isMobileMenuActive: false,
    isCartVisible: false,
    isPopupVisible: false,
    popupType: '',
    popupTitle: '',
}

const utilsSlice = createSlice({
    name: 'utils',
    initialState,
    reducers: {
        setMobileMenuActive: (state, action: PayloadAction<boolean>) => {
            state.isMobileMenuActive = action.payload;
        },
        setCartVisibility: (_state, _action: PayloadAction<boolean>) => {
            // legacy noop — корзина рендерится через CartIcon без этого флага
        },
        setPopupVisibility: (state) => {
            state.isPopupVisible = !state.isPopupVisible;
        },
        setPopupType: (state, action: PayloadAction<'lead' | ''>) => {
            state.popupType = action.payload;
        },
        setPopupTitle: (state, action: PayloadAction<string>) => {
            state.popupTitle = action.payload;
        },
    }
})

export const { actions, reducer } = utilsSlice;
