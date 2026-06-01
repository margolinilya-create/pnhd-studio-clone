import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { apiBaseUrl } from "@/app/utils/constants";
import {
  ICdekCitySearchResponse,
  ICdekPointsResponse,
  ICdekPriceResponse,
  ICreateOrderPayload,
  ICreateOrderResponse,
} from "@/app/utils/types";

export type LeadSource =
  | 'footer'
  | 'popup'
  | 'shop-no-model'
  | 'product-page'
  | 'methods-consultation'
  | 'checkout';


export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: apiBaseUrl }),
  endpoints: (builder) => ({
    getCdekCitiesData: builder.query<Array<ICdekCitySearchResponse>, string>({
      query: (data) => ({
        url: `/api/shipping/cities?city=${data}`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }),
      transformResponse: (
        response: Array<ICdekCitySearchResponse>
      ): Array<ICdekCitySearchResponse> => {
        const russiaCitiesArr = response.filter(
          (item) => item.country === "Россия"
        );
        return russiaCitiesArr;
      },
    }),
    getCdekPoints: builder.query<Array<ICdekPointsResponse>, number>({
      query: (data) => ({
          url: `/api/shipping/points?city_code=${data}`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }),
    }),
    getCdekDeliveryPrice: builder.query<ICdekPriceResponse, {orderWeightArr: Array<{weight: number}>, cityTo: ICdekCitySearchResponse, totalPrice: number}>({
      query: (priceData) => {

        const data = {
            tariff_code: '138',
            from_location: {
              code: '137',
            },
            to_location: {
              code: priceData.cityTo.code.toString(),
            },
            services: [
              {
                code: 'INSURANCE',
                parameter: priceData.totalPrice.toString(),
              },
            ],
            packages: [...priceData.orderWeightArr],
        }


        return {
            url: "/api/shipping/calculate/",
            method: "POST",
            body: JSON.stringify(data),
            headers: {
            "Content-Type": "application/json",
            },
      }},
    }),
    createOrder: builder.mutation<ICreateOrderResponse, ICreateOrderPayload>({
      // POST /api/orders/create — custom endpoint, читает Payload local API,
      // resolve products/variants/prices, валидирует stock и promo, создаёт
      // Order + OrderItems. Возвращает paymentUrl=null (Phase 5 СБП отложено).
      query: (data) => ({
        url: '/api/orders/create',
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    }),
    promocodeValidation: builder.mutation<unknown, {user_promocode: string}>({
      query: (data) => ({
        url: '/api/promocodes/',
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Content-length': '',
        },
      })
    }),

  }),
});

export const {
  useGetCdekCitiesDataQuery,
  useGetCdekPointsQuery,
  useGetCdekDeliveryPriceQuery,
  useCreateOrderMutation,
  usePromocodeValidationMutation,
} = api;
