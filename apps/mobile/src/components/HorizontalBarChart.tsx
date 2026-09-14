import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/theme/colors";
type Row={name:string;value:number};
export default function HorizontalBarChart({title,data,limit=10}:{title:string;data:Row[];limit?:number}) {
 const rows=(data||[]).slice(0,limit); const max=Math.max(1,...rows.map(x=>Number(x.value)||0));
 return <View style={s.card}><Text style={s.title}>{title}</Text>{rows.length?rows.map((r,i)=><View key={`${r.name}-${i}`} style={s.row}><View style={s.meta}><Text numberOfLines={1} style={s.name}>{r.name||"Unknown"}</Text><Text style={s.value}>{r.value}</Text></View><View style={s.track}><View style={[s.bar,{width:`${Math.max(2,(Number(r.value)||0)/max*100)}%`}]} /></View></View>):<Text style={s.empty}>No data available</Text>}</View>;
}
const s=StyleSheet.create({card:{borderWidth:1,borderColor:colors.border,borderRadius:22,backgroundColor:colors.surface,padding:17},title:{color:colors.text,fontSize:13,fontWeight:"900",textTransform:"uppercase",letterSpacing:1.2,marginBottom:14},row:{marginBottom:13},meta:{flexDirection:"row",justifyContent:"space-between",gap:10,marginBottom:6},name:{flex:1,color:colors.textMuted,fontSize:11,fontWeight:"700"},value:{color:colors.primary,fontSize:11,fontWeight:"900"},track:{height:8,borderRadius:99,backgroundColor:colors.borderSoft,overflow:"hidden"},bar:{height:"100%",borderRadius:99,backgroundColor:colors.primary},empty:{color:colors.textDim,fontSize:12,paddingVertical:18,textAlign:"center"}});
