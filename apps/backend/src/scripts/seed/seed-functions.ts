import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow
} from '@medusajs/medusa/core-flows'

import {
  CONFIGURATION_MODULE,
  ConfigurationModuleService,
  ConfigurationRuleDefaults
} from '@mercurjs/configuration'
import { SELLER_MODULE } from '@mercurjs/seller'

import sellerShippingProfile from '../../links/seller-shipping-profile'
import { createCommissionRuleWorkflow } from '../../workflows/commission/workflows'
import { createConfigurationRuleWorkflow } from '../../workflows/configuration/workflows'
import { createLocationFulfillmentSetAndAssociateWithSellerWorkflow } from '../../workflows/fulfillment-set/workflows'
import { createSellerWorkflow } from '../../workflows/seller/workflows'
import { productsToInsert } from './seed-products'

const countries = ['be', 'de', 'dk', 'se', 'fr', 'es', 'it', 'pl', 'cz', 'nl']

export async function createSalesChannel(container: MedusaContainer) {
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  let [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels(
    {
      name: 'Default Sales Channel'
    }
  )

  if (!defaultSalesChannel) {
    const {
      result: [salesChannelResult]
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: 'Default Sales Channel'
          }
        ]
      }
    })
    defaultSalesChannel = salesChannelResult
  }

  return defaultSalesChannel
}

export async function createStore(
  container: MedusaContainer,
  salesChannelId: string,
  regionId: string
) {
  const storeModuleService = container.resolve(Modules.STORE)
  const [store] = await storeModuleService.listStores()

  if (!store) {
    return
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: 'eur',
            is_default: true
          }
        ],
        default_sales_channel_id: salesChannelId,
        default_region_id: regionId
      }
    }
  })
}
export async function createRegions(container: MedusaContainer) {
  const regionService = container.resolve(Modules.REGION)
  
  // Check if region already exists
  const existingRegions = await regionService.listRegions()
  if (existingRegions.length > 0) {
    return existingRegions[0]
  }

  const {
    result: [region]
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: 'Europe',
          currency_code: 'eur',
          countries,
          payment_providers: ['pp_system_default']
        }
      ]
    }
  })

  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code
    }))
  })

  return region
}

export async function createPublishableKey(
  container: MedusaContainer,
  salesChannelId: string
) {
  const apiKeyService = container.resolve(Modules.API_KEY)

  let [key] = await apiKeyService.listApiKeys({ type: 'publishable' })

  if (!key) {
    const {
      result: [publishableApiKeyResult]
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: 'Default publishable key',
            type: 'publishable',
            created_by: ''
          }
        ]
      }
    })
    key = publishableApiKeyResult
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: key.id,
      add: [salesChannelId]
    }
  })

  return key
}

export async function createProductCategories(container: MedusaContainer) {
  const { result } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [
        {
          name: 'Sneakers',
          is_active: true
        },
        {
          name: 'Sandals',
          is_active: true
        },
        {
          name: 'Boots',
          is_active: true
        },
        {
          name: 'Sport',
          is_active: true
        },
        {
          name: 'Accessories',
          is_active: true
        },
        {
          name: 'Tops',
          is_active: true
        }
      ]
    }
  })

  return result
}

export async function createProductCollections(container: MedusaContainer) {
  const { result } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        {
          title: 'Luxury'
        },
        {
          title: 'Vintage'
        },
        {
          title: 'Casual'
        },
        {
          title: 'Soho'
        },
        {
          title: 'Streetwear'
        },
        {
          title: 'Y2K'
        }
      ]
    }
  })

  return result
}

export async function createSeller(container: MedusaContainer) {
  const authService = container.resolve(Modules.AUTH)

  const { authIdentity } = await authService.register('emailpass', {
    body: {
      email: 'seller@mercurjs.com',
      password: 'secret'
    }
  })

  const { result: seller } = await createSellerWorkflow.run({
    container,
    input: {
      auth_identity_id: authIdentity?.id,
      member: {
        name: 'John Doe',
        email: 'seller@mercurjs.com'
      },
      seller: {
        name: 'MercurJS Store'
      }
    }
  })

  return seller
}

export async function createSellerStockLocation(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const {
    result: [stock]
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: `Stock Location for seller ${sellerId}`,
          address: {
            address_1: 'Random Strasse',
            city: 'Berlin',
            country_code: 'de'
          }
        }
      ]
    }
  })

  await link.create([
    {
      [SELLER_MODULE]: {
        seller_id: sellerId
      },
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      }
    },
    {
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: 'manual_manual'
      }
    },
    {
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: salesChannelId
      },
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      }
    }
  ])

  await createLocationFulfillmentSetAndAssociateWithSellerWorkflow.run({
    container,
    input: {
      fulfillment_set_data: {
        name: `${sellerId} fulfillment set`,
        type: 'shipping'
      },
      location_id: stock.id,
      seller_id: sellerId
    }
  })

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const {
    data: [stockLocation]
  } = await query.graph({
    entity: 'stock_location',
    fields: ['*', 'fulfillment_sets.*'],
    filters: {
      id: stock.id
    }
  })

  return stockLocation
}

export async function createServiceZoneForFulfillmentSet(
  container: MedusaContainer,
  sellerId: string,
  fulfillmentSetId: string
) {
  await createServiceZonesWorkflow.run({
    container,
    input: {
      data: [
        {
          fulfillment_set_id: fulfillmentSetId,
          name: `Europe`,
          geo_zones: countries.map((c) => ({
            type: 'country',
            country_code: c
          }))
        }
      ]
    }
  })

  const fulfillmentService = container.resolve(Modules.FULFILLMENT)

  const [zone] = await fulfillmentService.listServiceZones({
    fulfillment_set: {
      id: fulfillmentSetId
    }
  })

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: {
      seller_id: sellerId
    },
    [Modules.FULFILLMENT]: {
      service_zone_id: zone.id
    }
  })

  return zone
}

export async function createSellerShippingOption(
  container: MedusaContainer,
  sellerId: string,
  sellerName: string,
  regionId: string,
  serviceZoneId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [shippingProfile]
  } = await query.graph({
    entity: sellerShippingProfile.entryPoint,
    fields: ['shipping_profile_id'],
    filters: {
      seller_id: sellerId
    }
  })

  const {
    result: [shippingOption]
  } = await createShippingOptionsWorkflow.run({
    container,
    input: [
      {
        name: `${sellerName} shipping`,
        shipping_profile_id: shippingProfile.shipping_profile_id,
        service_zone_id: serviceZoneId,
        provider_id: 'manual_manual',
        type: {
          label: `${sellerName} shipping`,
          code: sellerName,
          description: 'Europe shipping'
        },
        rules: [
          { value: 'true', attribute: 'enabled_in_store', operator: 'eq' },
          { attribute: 'is_return', value: 'false', operator: 'eq' }
        ],
        prices: [
          { currency_code: 'eur', amount: 10 },
          { amount: 10, region_id: regionId }
        ],
        price_type: 'flat',
        data: { id: 'manual-fulfillment' }
      }
    ]
  })

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: {
      seller_id: sellerId
    },
    [Modules.FULFILLMENT]: {
      shipping_option_id: shippingOption.id
    }
  })

  return shippingOption
}

export async function createSellerProducts(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
  const productService = container.resolve(Modules.PRODUCT)
  const collections = await productService.listProductCollections(
    {},
    { select: ['id', 'title'] }
  )
  const categories = await productService.listProductCategories(
    {},
    { select: ['id', 'name'] }
  )

  const randomCategory = () =>
    categories[Math.floor(Math.random() * categories.length)]
  const randomCollection = () =>
    collections[Math.floor(Math.random() * collections.length)]

  const toInsert = productsToInsert.map((p) => ({
    ...p,
    categories: [
      {
        id: randomCategory().id
      }
    ],
    collection_id: randomCollection().id,
    sales_channels: [
      {
        id: salesChannelId
      }
    ]
  }))

  const { result } = await createProductsWorkflow.run({
    container,
    input: {
      products: toInsert,
      additional_data: {
        seller_id: sellerId
      }
    }
  })

  return result
}

export async function createInventoryItemStockLevels(
  container: MedusaContainer,
  stockLocationId: string
) {
  const inventoryService = container.resolve(Modules.INVENTORY)
  const items = await inventoryService.listInventoryItems(
    {},
    { select: ['id'] }
  )

  const toCreate = items.map((i) => ({
    inventory_item_id: i.id,
    location_id: stockLocationId,
    stocked_quantity: Math.floor(Math.random() * 50) + 1
  }))

  const { result } = await createInventoryLevelsWorkflow.run({
    container,
    input: {
      inventory_levels: toCreate
    }
  })
  return result
}

export async function createDefaultCommissionLevel(container: MedusaContainer) {
  await createCommissionRuleWorkflow.run({
    container,
    input: {
      name: 'default',
      is_active: true,
      reference: 'site',
      reference_id: '',
      rate: {
        include_tax: true,
        type: 'percentage',
        percentage_rate: 2
      }
    }
  })
}

export async function createConfigurationRules(container: MedusaContainer) {
  const configurationService =
    container.resolve<ConfigurationModuleService>(CONFIGURATION_MODULE)

  for (const [ruleType, isEnabled] of ConfigurationRuleDefaults) {
    const [existingRule] = await configurationService.listConfigurationRules({
      rule_type: ruleType
    })

    if (!existingRule) {
      await createConfigurationRuleWorkflow.run({
        container,
        input: {
          rule_type: ruleType,
          is_enabled: isEnabled
        }
      })
    }
  }
}

// Seed Iranian states and cities (Persian names)
export async function createIranStatesAndCities(container: MedusaContainer) {

  const iranStatesAndCities: Array<{ state: string; cities: string[] }> =  [
{ state: "تهران",		cities: ["احمد آباد مستوفی","ادران","اسلام آباد","اسلام شهر","اكبر آباد","اميريه","انديشه","اوشان","آبسرد","آبعلی","باغستان","باقر شهر","برغان","بومهن","پارچين","پاكدشت","پرديس","پرند","پس قلعه","پيشوا","تجزيه مبادلات لشكر","تهران","جاجرود","چرمسازی سالاريه","چهار دانگه","حسن آباد","حومه گلندوک","خاتون آباد","خاوه","خرمدشت","دركه","دماوند","رباط كريم","رزگان","رودهن","ری","سعيد آباد","سلطان آباد","سوهانک","شاهد شهر","شريف آباد","شمس آباد","شهر قدس","شهرآباد","شهرجديد پرديس","شهرقدس","شهريار","شهريار بردآباد","صالح آباد","صفادشت","فرودگاه امام خمينی","فرون آباد","فشم","فيروزكوه","قرچک","قيام دشت","كهريزک","كيلان","گلدسته","گلستان","گيلاوند","لواسان","لوسان بزرگ","مارليک","مروزبهرام","ملارد","نسيم شهر","نصيرآباد","واوان","وحيديه","ورامين","وهن آباد"]},		
{ state: "گیلان",		cities: ["احمد سرگوراب","اسالم","اسكلک","اسلام آباد","اطاقور","املش","آبكنار","آستارا","آستانه اشرفيه","بازار اسالم","بازارجمعه شاندرمن","برهسر","بلترک","بلسبنه","بندر انزلی","پاشاكی","پرهسر","پلاسی","پونل","پيربست لولمان","توتكابن","جوكندان","جيرنده","چابكسر","چاپارخانه","چوبر","خاچكين","خشک بيجار","خطبه سرا","خمام","ديلمان","رانكوه","رحيم آباد","رستم آباد","رشت","رضوان شهر","رودبار","رودسر","سراوان","سنگر","سياهكل","شاندرمن","شفت","صومعه سرا","طاهر گوداب","طوللات","فومن","قاسم آبادسفلی","كپورچال","كلاچای","كوچصفهان","كومله","كياشهر","گشت","لاهيجان","لشت نشا","لنگرود","لوشان","لولمان","لوندويل","ليسار","ماسال","ماسوله","منجيل","هشتپر ـ طوالش","واجارگاه","چمخاله"]},		
{ state: "آذربایجان شرقی",		cities: ["ابشاحمد","اذغان","اسب فروشان","اسكو","اغچه ريش","اقمنار","القو","اهر","ايلخچی","آذرشهر","باسمنج","بخشايش ـ كلوانق","بستان آباد","بناب","بناب جديد ـ مرند","تبريز","ترک","تسوج","جلفا","خامنه","خداآفرين","خسروشهر","خضرلو","خلجان","سبلان","سراب","سردرود","سيس","شادباد مشايخ","شبستر","شربيان","شرفخانه","شهرجديد سهند","صوفيان","عجب شير","قره اغاج ـ چاراويماق","قره بابا","كردكندی","كليبر","كندرود","كندوان","گوگان","مراغه","مرند","ملكان","ممقان","ميانه","هاديشهر","هريس","هشترود","هوراند","ورزقان"]},		
{ state: "خوزستان",		cities: ["اروند كنار","اميديه","انديمشک","اهواز","ايذه","آبادان","آغاجاری","باغ ملک","بندرامام خمينی","بهبهان","جايزان","جنت مكان","چمران ـ شهرک طالقانی","حميديه","خرمشهر","دزآب","دزفول","دهدز","رامشير","رامهرمز","سربندر","سردشت","سماله","سوسنگرد ـ دشت آزادگان","شادگان","شرافت","شوش","شوشتر","شيبان","صالح مشطت","كردستان بزرگ","گتوند","لالی","ماهشهر","مسجد سليمان","ملاثانی","ميانكوه","هفتگل","هنديجان","هويزه","ويس"]},
{ state: "فارس",		cities: [" بيضا","اردكان ـ سپيدان","ارسنجان","استهبان","اشكنان ـ اهل","اقليد","اكبرآباد كوار","اوز","ايزدخواست","آباده","آباده طشک","بالاده","بانش","بنارويه","بهمن","بوانات","بوانات (سوريان)","بيرم","جنت شهر (دهخير)","جهرم","جويم","حاجی آباد ـ زرين دشت","حسن آباد","خرامه","خرمی","خشت","خنج","خيرآباد توللی","داراب","داريان","دهرم","رونيز","زاهدشهر","زرقان","سروستان","سعادت شهر ـ پاسارگاد","سيدان","ششده","شهرجديد صدرا","شيراز","صغاد","صفاشهر ـ خرم بيد","طسوج","علاءمرودشت","فدامی","فراشبند","فسا","فيروزآباد","فيشور","قادرآباد","قائميه","قطب آباد","قطرويه","قير و كارزين","كازرون","كام فيروز","كلانی","كنارتخته","كوار","گراش","گويم","لار ـ لارستان","لامرد","مبارک آباد","مرودشت","مشكان","مصيری ـ رستم","مظفری","مهر","ميمند","نورآباد ـ ممسنی","نی ريز","وراوی"]},		
{ state: "اصفهان",		cities: ["ابريشم","ابوزيد آباد","اردستان","اريسمان","اژيه","اسفرجان","اسلام آباد","اشن","اصغر آباد","اصفهان","امين آباد","ايمان شهر","آران و بيدگل","بادرود","باغ بهادران","بهارستان","بوئين و مياندشت","پيربكران","تودشک","تيران","جعفرآباد","جندق","جوجيل","چادگان","چرمهين","چمگردان","حسن آباد","خالد آباد","خمينی شهر","خوانسار","خوانسارک","خور","خوراسگان","خورزوق","داران ـ فريدن","درچه پياز","دستگرد و برخوار","دهاقان","دهق","دولت آباد","ديزيچه","رزوه","رضوان شهر","رهنان","زاينده رود","زرين شهر ـ لنجان","زواره","زيار","زيبا شهر","سپاهان شهر","سده لنجان","سميرم","شاهين شهر","شهرضا","شهرک صنعتی مورچ","شهرک مجلسی","شهرک صنعتی محمودآباد","طالخونچه","عسگران","علويچه","غرغن","فرخی","فريدون شهر","فلاورجان","فولادشهر","فولاد مباركه","قهدريجان","كاشان","كليشاد و سودرجان","كمشچه","كوهپايه","گز","گلپايگان","گلدشت","گلشهر","گوگد","مباركه","مهاباد","مورچه خورت","ميمه","نائين","نجف آباد","نصر آباد","نطنز","نيک آباد","بهارستان","هرند","ورزنه","ورنامخواست","ویلاشهر"]},		
{ state: "خراسان رضوی",		cities: ["ابدال آباد","ازادوار","باجگيران","باخرز","باسفر","بجستان","بردسكن","برون","بزنگان","بند قرای","بيدخت","تايباد","تربت جام","تربت حيدريه","جغتای","جنگل","چمن آباد","چناران","خليل آباد","خواف","داورزن","درگز","دولت آباد ـ زاوه","رادكان","رشتخوار","رضويه","ريوش (كوهسرخ)","سبزوار","سرخس","سلطان آباد","سنگان","شانديز","صالح آباد","طرقبه ـ بينالود","طوس سفلی","فريمان","فيروزه ـ تخت جلگه","فيض آباد ـ مه ولات","قاسم آباد","قدمگاه","قوچان","كاخک","كاشمر","كلات","گلبهار","گناباد","لطف آباد","مشهد","مشهد ريزه","مصعبی","نشتيفان","نقاب ـ جوين","نيشابور","نيل شهر"]},		
{ state: "قزوین",		cities: ["َآوج","ارداق","اسفرورين","اقباليه","الوند","آبگرم","آبيک","آقابابا","بوئين زهرا","بیدستان","تاكستان","حصار","خاكعلی","خرم دشت","دانسفهان","سيردان","شال","شهر صنعتی البرز","ضياآباد","قزوين","ليا","محمديه","محمود آباد نمونه","معلم كلايه","نرجه"]},		
{ state: "سمنان",		cities: ["ارادان","اميريه","ايوانكی","بسطام","بيارجمند","خيرآباد","دامغان","درجزين","سرخه","سمنان","شاهرود","شهميرزاد","گرمسار","مجن","مهدی شهر","ميامی","ميغان"]},		
{ state: "قم",		cities: ["دستجرد","سلفچگان","شهر جعفریه","قم","قنوات","كهک"]},		
{ state: "مرکزی",		cities: ["اراک","آستانه","آشتيان","تفرش","توره","جاورسيان","خسروبيک","خشک رود","خمين","خنداب","دليجان","ريحان عليا","زاويه","ساوه","شازند","شهراب","شهرک مهاجران","فرمهين","كميجان","مامونيه ـ زرنديه","محلات","ميلاجرد","هندودر"]},		
{ state: "زنجان",		cities: ["آب بر ـ طارم","ابهر","اسفجين","پری","حلب","خرمدره","دستجرده","دندی","زرين آباد ـ ايجرود","زرين رود","زنجان","سلطانيه","صائين قلعه","قيدار","گرماب","گيلوان","ماهنشان","همايون","هيدج"]},		
{ state: "مازندران",		cities: ["اسلام آباد","اميركلا","ايزدشهر","آمل","آهنگركلا","بابل","بابلسر","بلده","بهشهر","بهنمير","پل سفيد ـ سوادكوه","تنكابن","جويبار","چالوس","چمستان","خرم آباد","خوشرودپی","رامسر","رستم كلا","رويانشهر","زاغمرز","زرگر محله","زيرآب","سادات محله","ساری","سرخرود","سلمانشهر","سنگده","سوا","سورک","شيرگاه","شيرود","عباس آباد","فريدون كنار","قائم شهر","كلارآباد","كلاردشت","كيا كلا","كياسر","گزنک","گلوگاه","گهرباران","محمود آباد","مرزن آباد","مرزی كلا","نشتارود","نكاء","نور","نوشهر"]},		
{ state: "گلستان",		cities: ["انبار آلوم","اينچه برون","آزادشهر","آق قلا","بندر گز","بندر تركمن","جلين","خان ببين","راميان","سيمين شهر","علی آباد","فاضل آباد","كردكوی","كلاله","گاليكش","گرگان","گميش تپه","گنبد كاوس","مراوه تپه","مينودشت"]},		
{ state: "اردبیل",		cities: ["ابی بيگلو","اردبيل","اصلاندوز","بيله سوار","پارس آباد","تازه كند انگوت","جعفرآباد","خلخال","سرعين","شهرک شهيد غفاری","كلور","كوارئيم","گرمی","گيوی ـ كوثر","لاهرود","مشگين شهر","نمين","نير","هشتجين"]},		
{ state: "آذربایجان غربی",		cities: ["اروميه","اشنويه","ايواوغلی","بازرگان","بوكان","پسوه","پلدشت","پيرانشهر","تازه شهر","تكاب","چهاربرج قديم","خوی","ديزج","ديزجديز","ربط","زيوه","سردشت","سلماس","سيلوانا","سيلوه","سيه چشمه ـ چالدران","شاهين دژ","شوط","قره ضياء الدين ـ چايپاره","قوشچی","كشاورز (اقبال)","ماكو","محمد يار","محمودآباد","مهاباد","مياندوآب","مياوق","ميرآباد","نقده","نوشين شهر"]},		
{ state: "همدان",		cities: ["ازندريان","اسدآباد","اسلام آباد","بهار","پايگاه نوژه","تويسركان","دمق","رزن","سامن","سركان","شيرين سو","صالح آباد","فامنين","قروه درجزين","قهاوند","كبودرآهنگ","گيان","لالجين","ملاير","نهاوند","همدان"]},		
{ state: "کردستان",		cities: ["اورامانتخت","بانه","بلبان آباد","بيجار","دلبران","دهگلان","ديواندره","سروآباد","سريش آباد","سقز","سنندج","قروه","كامياران","مريوان","موچش"]},		
{ state: "کرمانشاه",		cities: ["اسلام آباد غرب","باينگان","بيستون","پاوه","تازه آباد ـ ثلاث باباجانی","جوانرود","روانسر","ريجاب","سراب ذهاب","سرپل ذهاب","سنقر","صحنه","فرامان","فش","قصرشيرين","كرمانشاه","كنگاور","گيلانغرب","نودشه","هرسين","هلشی"]},		
{ state: "لرستان",		cities: ["ازنا","الشتر ـ سلسله","اليگودرز","برخوردار","بروجرد","پل دختر","تقی آباد","چغلوندی","چقابل","خرم آباد","دورود","زاغه","سپيددشت","شول آباد","كونانی","كوهدشت","معمولان","نورآباد ـ دلفان","واشيان نصيرتپه"]},		
{ state: "بوشهر",		cities: ["ابدان","اهرم ـ تنگستان","آباد","آبپخش","بادوله","برازجان ـ دشتستان","بردخون","بندردير","بندرديلم","بندرريگ","بندركنگان","بندرگناوه","بوشهر","تنگ ارم","جزيره خاک","جم","چغارک","خورموج ـ دشتی","دلوار","ريز","سعدآباد","شبانكاره","شنبه","شول","عالی شهر","عسلويه","كاكی","كلمه","نخل تقی","وحدتيه"]},		
{ state: "کرمان",		cities: ["اختيارآباد","ارزوئیه","امين شهر","انار","باغين","بافت","بردسير","بلوک","بم","بهرمان","پاريز","جواديه فلاح","جوشان","جيرفت","چترود","خانوک","دوساری","رابر","راور","راين","رفسنجان","رودبار","ريگان","زرند","زنگی آباد","سرچشمه","سريز","سيرجان","شهربابک","صفائيه","عنبرآباد","فارياب","فهرج","قلعه گنج","كاظم آباد","كرمان","كهنوج","كهنوج (مغزآباد)","كوهبنان","كيان شهر","گلباف","ماهان","محمدآباد ـ ريگان","محی آباد","منوجان","نجف شهر","نگار"]},		
{ state: "هرمزگان",		cities: ["ابوموسی","ايسين","بستک","بندر خمير","بندر عباس","بندر لنگه","بندزک كهنه","پارسيان","پدل","پل شرقی","تياب","جاسک","جزيره سيری","جزيره لاوان","جزيره هنگام","جزيرهلارک","جناح","چارک","حاجی آباد","درگهان","دشتی","دهبارز ـ رودان","رويدر","زيارت علی","سردشت ـ بشاگرد","سندرک","سيريک","فارغان","فين","قشم","كنگ","كيش","ميناب"]},		
{ state: "چهارمحال و بختیاری",		cities: ["اردل","آلونی","باباحيدر","بروجن","بلداجی","بن","جونقان","چالشتر","چلگرد ـ كوهرنگ","دزک","دستنای","دشتک","سامان","سودجان","سورشجان","شلمزار ـ كيار","شهركرد","فارسان","فرادنبه","فرخ شهر","كیان","گندمان","گهرو","لردگان","مال خليفه","ناغان","هارونی","هفشجان","وردنجان"]},		
{ state: "یزد",		cities: ["ابركوه","احمدآباد","اردكان","بافق","بفروئيه","بهاباد","تفت","حميديا","زارچ","شاهديه","صدوق","طبس","عشق آباد","فراغه","مروست","مهريز","ميبد","نير","هرات ـ خاتم","يزد"]},		
{ state: "سیستان و بلوچستان",		cities: ["اسپكه","ايرانشهر","بزمان","بمپور","بنت","بنجار","پسكو","تيمور آباد","جالق","چابهار","خاش","دوست محمد ـ هيرمند","راسک","زابل","زابلی","زاهدان","زهک","ساربوک","سراوان","سرباز","سنگان","سوران ـ سيب سوران","سيركان","فنوج","قصرقند","كنارک","كيتج","گلمورتی ـ دلگان","گوهركوه","محمدآباد","ميرجاوه","نصرت آباد","نگور","نيک شهر","هيدوچ"]},		
{ state: "ایلام",		cities: ["اركواز","ارمو","ايلام","ايوان","آبدانان","آسمان آباد","بدره","توحيد","چشمه شيرين","چوار","دره شهر","دهلران","سرابله ـ شيروان و چرداول","شباب ","شهرک اسلاميه","لومار","مهران","موسيان","ميمه"]},		
{ state: "کهگلویه و بویراحمد",		cities: ["باشت","پاتاوه","چرام","دهدشت ـ كهگيلويه","دوگنبدان ـ گچساران","ديشموک","سپيدار","سوق","سي سخت ـ دنا","قلعه رئيسی","لنده","ليكک","مادوان","ياسوج"]},		
{ state: "خراسان شمالی",		cities: ["اسفراين","ايور","آشخانه ـ مانه و سلمقان","بجنورد","جاجرم","درق","راز","شوقان","شيروان","فاروج","گرمه"]},		
{ state: "خراسان جنوبی",		cities: ["ارسک","اسديه ـ درميان","آرين شهر","آيسک","بشرويه","بیرجند","حاجی آباد","خضری دشت بياض","خوسف","زهان","سر بیشه","سرايان","سه قلعه","فردوس","قائن ـ قائنات","گزيک","مود","نهبندان","نیمبلوک"]},		
{ state: "البرز",		cities: ["اشتهارد","آسارا","چهارباغ","سيف آباد","شهرجديد هشتگرد","بالا طالقان","شهرک طالقان","پایین طالقان","كرج","كمال شهر","كوهسار ـ چندار","گرمدره","ماهدشت","محمدشهر","مشکين دشت","نظرآباد","هشتگرد ـ ساوجبلاغ"]}
  ]

  // Resolve city module service, which exposes both createStates and createCities
  let cityService: any
  try {
    cityService = container.resolve('city')
  } catch {
    try {
      cityService = container.resolve('cityModuleService')
    } catch {}
  }
  if (!cityService || typeof cityService.createCities !== 'function') return

  // Insert states (id auto-generated by service)
  const statesPayload = iranStatesAndCities.map(({ state }) => ({ name: state, country_code: 'ir' }))
  const createdStates = await cityService.createStates(statesPayload as any)

  // Map state name -> id
  const nameToId = new Map<string, string>()
  createdStates.forEach((s: any) => nameToId.set(s.name, s.id))

  // Insert cities with state_id
  const citiesPayload: Array<{ name: string; country_code: string; state_id: string }> = []
  iranStatesAndCities.forEach(({ state, cities }) => {
    const state_id = nameToId.get(state)
    if (!state_id) return
    cities.forEach((name) => citiesPayload.push({ name, country_code: 'ir', state_id }))
  })

  const BATCH = 200
  for (let i = 0; i < citiesPayload.length; i += BATCH) {
    const batch = citiesPayload.slice(i, i + BATCH)
    try {
      await cityService.createCities(batch as any)
    } catch {
      // ignore duplicates
    }
  }
}
