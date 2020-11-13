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