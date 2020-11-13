# Salesforce CMS LWC

こちらのレポジトリーはLWCで実装するSalesforceCMSのサンプルコードです。
ディレクトリー構成やソースコードの説明は以下に記載します。

## ディレクトリー構成

重要なディレクトリー構成を下記に記載します。

```
- force-app
 - main
  - default
   - classes
    - DEMJContentManagement.cls // Salesforce CMSコンテンツを取得するためのAPEXクラス
   - lwc
    - demjCMSContent // LWCコンポーネントディデクトリー
     - demjCMSContent.css // スタイリング
     - demjCMSContent.html // HTMLコード
     - demjCMSContent.js // JSコントローラー
     - demjCMSContent.js-meta.xml // メタデータ
   - managedContentTypes
    - cms_image.managedContentType-meta // 今回使用するSalesforce CMSのコンテンツタイプのメータデータ
```

## CMSコンテンツデータを取得
CMSコンテンツデータを取得するためにはLWC（Lightning Web Component）のみで取得することができないので、Apexを経由して取得する必要があります。

### APEXクラス詳細説明

全体的なコードは下記に記載します。

```Apex
public with sharing class DEMJContentManagement {
 
    @AuraEnabled(cacheable=true)
    public static List<ConnectApi.ManagedContentVersion> initMethod(){
        MCController mcController = new MCController();
        return mcController.results;
    }

    @AuraEnabled
    public static String[] getUserWebinar() {
        try {
            Id userId = UserInfo.getUserId();
            User u = [select id, Webinar__c from User where id = : userId];
            return u.Webinar__c.split(';');
        } catch(Exception e) {
            System.debug('Error Message : '+e);
            return null;
        }
    }
 
    public class MCController{
        private String communityId;
        public List<ConnectApi.ManagedContentVersion> results;
 
        public MCController(){
            communityId = Network.getNetworkId();
            getMContent();
        }
         
        public void getMContent() {
            try{
                String language = 'ja';
                ConnectApi.ManagedContentVersionCollection contentList = ConnectApi.ManagedContent.getAllManagedContent(communityId, 0, 25, language, 'cms_image', true);
                System.debug(contentList);
                results = contentList.items;           
            }
            catch(ConnectApi.ConnectApiException e){
                System.debug('Error Message : '+e);
                results = new List<ConnectApi.ManagedContentVersion>();
            }           
        }
    }   
}
```

一つ一つのコードを見ていきましょう。

#### MCController

こちらのクラスは`ConnectApi`よりSalesforceCMSのコンテンツを取得するためのでクラスです。ConnectAPIの仕様は[こちら](https://developer.salesforce.com/docs/atlas.ja-jp.apexcode.meta/apexcode/apex_classes_connect_api.htm)で参考できます。

今回SalesforceCMSのコンテンツは特定のコミュニティーページに作成されましたので、以下の用に`MCController`のコンストラクターでコミュニティーIDを取得します。
```Apex
communityId = Network.getNetworkId();
```

#### MCControllerのgetMContentメソッド
Apexクラスのメイン処理はこちらのメソッドにあります。
[ConnectApi.ManagedContent.getAllManagedContent](https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_ConnectAPI_ManagedContent_static_methods.htm)でCMSコンテンツを取得します。以下はgetAllManagedContentメソッドの仕様：

```
getAllManagedContent(String communityId, Integer pageParam, Integer pageSize, String language, String managedContentType, showAbsoluteUrl)
```
パラメータ説明：
- communityId: コミュニティID
- pageParam :  ページ数、０を指摘するとページ１のコンテンツが返ってきます
- pageSize: ページ毎の最大コンテンツ数
- language: コンテンツは言語毎に分かれるのでどの言語のコンテンツを取得するのを指摘する必要があります
- managedContentType: 一番重要なパラメータで、コンテンツの種類名を指摘します
- showAbsoluteUrl: 取得するコンテンツのURLが絶対URLか相対かを指摘することができます。外部サービスやコミュニティーページには絶対URLを取得した方が無難です。

コンテンツの種類名はSalesforce上で拝見することができないので、メーターデータを覗きながら取得しないといけません。以下の画像（GIF）をご参考ください。
![メータデータ](./contenttype-metadata.gif)

```Apex
results = contentList.items;
```
得されたコンテンツのアイテムを`results`変数に渡します。後でこちらの変数はLWC側に渡します。

#### DEMJContentManagementクラスのinitMethodメソッド
```Apex
@AuraEnabled(cacheable=true)
public static List<ConnectApi.ManagedContentVersion> initMethod(){
    MCController mcController = new MCController();
    return mcController.results;
}
```
こちらのメソッドはLWC側にコンテンツを渡すためのメソッドです。先ほど取得された`results`変数はこちらのメソッドでLWCに渡されます。

#### DEMJContentManagementクラスのgetUserWebinarメソッド
```Apex
@AuraEnabled
public static String[] getUserWebinar() {
    try {
        Id userId = UserInfo.getUserId();
        User u = [select id, Webinar__c from User where id = : userId];
        return u.Webinar__c.split(';'); // セミコロン区切りなので、Splitする必要があります
    } catch(Exception e) {
        System.debug('Error Message : '+e);
        return null;
    }
}
```
今回はユーザー毎にまだ申し込んでないWebinarのコンテンツのみが表示されますので、こちらので申し込んだWebinarを取得して、LWC側でコンテンツをフィルタリングします。


### LWCコンポーネント詳細説明

LWCでは CSS、HTML、JS、メーターデータのファイルで分かれてます。今回必要な処理はHTMLとJSにありますので、CSSとメータデータの説明はスキップします。

#### demjCMSContent.js

こちらはLWCでのメイン処理です。一つ一つのコードを以下に説明させていただきます。

- State
```JavaScript
@track results; // 上記で取得されたコンテンツを保管するための変数です。
@track datas = []; // レンダリングする際に必要な変数
@track loaded = false; // 非同期処理を待つ間にローディング画面を表示するための変数
```

```JavaScript
/**
 *  ApexのinitMethodを非同期処理で呼び込む
 **/
@wire(initMethod)
loadRecord({ error, data }) {
  if (error) console.error(error);
  if (data) {
    this.results = data; // initMethodの戻り値はこちらの変数に保管
    this.populateData();
  }
}
```

```JavaScript
/**
 * レンダリングする際に必要なデータを生成
 **/
populateData = async () => {
  try {
    const userWebinars = await getUserWebinar();　// 非同期処理でユーザが申し込んだwebinarを取得
    this.results.forEach(val => {
      const { source, title } = val.contentNodes;
      if (userWebinars && userWebinars.indexOf(val.title) > -1) {
        // 申し込んだwebinarの場合スキップ
        return;
      }
      // レンダーリングに必要なデータを生成
      this.datas.push({
        id: val.managedContentId,
        image: source.url,
        title: title.value,
        description: (val.contentNodes.altText) ? val.contentNodes.altText.value : '', // altTextはオプショナルなので、念のためチェックしデフォルト値を設定
        url: (val.contentNodes.thumbUrl) ? val.contentNodes.thumbUrl.value : '#',　// thumbUrlもオプショナルなので、念のためチェックしデフォルト値を設定
      });
    });
    // 生成されたデータをタイトル順で並び替える
    this.datas.sort((prev, next) => {
      const nameA = prev.title;
      const nameB = next.title;
      if (nameA < nameB) {
        return -1;
      }
      if (nameA > nameB) {
        return 1;
      }
      return 0;
    })
    this.loaded = true;
  } catch (e) {
    console.error(e)
  }
}
```

#### demjCMSContent.html

今回レンダリングUIは２種類用意されます。カルーセルとカード型です。

```html
<template>
  <!-- 非同期処理が終わるまでローディングスピナーを回す -->
  <template if:false={loaded}>
    <lightning-spinner alternative-text="Loading" size="medium"></lightning-spinner>
  </template>
  <template if:true={loaded}>
    <!-- カルーセル型でデータをレンダリングする -->
    <div class="container">
      <lightning-carousel>
        <template for:each={datas} for:item="data">
          <lightning-carousel-image key={data.id} src={data.image} header={data.title} description={data.description}
            href={data.url}>
          </lightning-carousel-image>
        </template>
      </lightning-carousel>
    </div>

    <div class="card-container">
      <template for:each={datas} for:item="data">
        <!-- カード型でデータをレンダリングする -->
        <div class="card-sizer" key={data.id}>
          <a href={data.url} target="_blank">
            <lightning-card>
              <p class="slds-p-horizontal_small centering">
                <img src={data.image} />
              </p>
              <p slot="footer" class="footer">
                <span class="title">{data.title}</span>
                <span class="description">{data.description}</span>
              </p>
            </lightning-card>
          </a>
        </div>
      </template>
    </div>
  </template>
</template>
```

以上です。