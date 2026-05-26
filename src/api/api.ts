import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { apiBaseUrl } from "@/app/utils/constants";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  ICdekCitySearchResponse,
  ICdekPointsResponse,
  ICdekPriceResponse,
  IOrderBody,
} from "@/app/utils/types";

export type LeadSource =
  | 'footer'
  | 'popup'
  | 'shop-no-model'
  | 'product-page'
  | 'methods-consultation';

export interface ICreateLeadPayload {
  name: string;
  phone: string;
  email?: string;
  comment?: string;
  reference_url?: string;
  source: LeadSource;
  roistat_visit?: string;
}

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
    createOrder: builder.mutation<{id: string, paymentUrl: string}, IOrderBody>({
      query: (data) => ({
        url: '/api/orders',
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Content-length': '',
        },
      }),
    }),
    createLead: builder.mutation<{ leadId: string }, ICreateLeadPayload>({
      // Edge Function `create-lead`: пишет в public.leads + опц. шлёт в Bitrix24.
      queryFn: async (payload) => {
        try {
          const supabase = getSupabaseClient();
          const { data, error } = await supabase.functions.invoke<{
            ok: boolean;
            leadId?: string;
            error?: string;
          }>('create-lead', { body: payload });
          if (error) {
            return {
              error: {
                status: 'CUSTOM_ERROR',
                error: error.message,
              } as any,
            };
          }
          if (!data?.ok || !data.leadId) {
            return {
              error: {
                status: 'CUSTOM_ERROR',
                error: data?.error ?? 'create_lead_failed',
              } as any,
            };
          }
          return { data: { leadId: data.leadId } };
        } catch (e) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: e instanceof Error ? e.message : String(e),
            } as any,
          };
        }
      },
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
  useCreateLeadMutation,
  usePromocodeValidationMutation,
} = api;
