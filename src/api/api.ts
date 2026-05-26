import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { apiBaseUrl } from "@/app/utils/constants";
import { fetchGalleryImages } from "@/lib/queries/gallery";
import {
  IUploadPrintResponse,
  ICdekCitySearchResponse,
  ICdekPointsResponse,
  ICdekPriceResponse,
  IOrderBody,
} from "@/app/utils/types";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: apiBaseUrl }),
  endpoints: (builder) => ({
    uploadPrintImage: builder.mutation<IUploadPrintResponse, FormData>({
      query: (data) => ({
        url: "/api/uploads/",
        method: "POST",
        body: data,
      }),
    }),
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
    createLead: builder.mutation<
      { message: string },
      {
        name: string;
        phone: string;
        roistat: string;
        email?: string;
        comment?: string;
        reference_url?: string;
      }
    >({
      query: (data) => ({
        url: '/api/leads/',
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
          'Content-length': '',
        },
      })
    }),
    getGalleryImages: builder.query<Array<{id: string, src: string, alt: string}>, void>({
      // Supabase-backed: см. src/lib/queries/gallery.ts
      queryFn: async () => {
        try {
          const data = await fetchGalleryImages();
          return { data };
        } catch (error) {
          return { error: { status: 'CUSTOM_ERROR', error: String(error) } as any };
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
  useUploadPrintImageMutation,
  useGetCdekCitiesDataQuery,
  useGetCdekPointsQuery,
  useGetCdekDeliveryPriceQuery,
  useGetGalleryImagesQuery,
  useCreateOrderMutation,
  useCreateLeadMutation,
  usePromocodeValidationMutation,
} = api;
